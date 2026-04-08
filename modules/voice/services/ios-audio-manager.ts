// modules/voice/services/ios-audio-manager.ts
// Singleton: iOS-kompatibler Audio-Manager mit Silent-Buffer-Unlock
// Loest das Problem, dass iOS Safari Audio nur nach User-Geste erlaubt.
// Session 59 — Phase 3 Enterprise Voice Architecture

/** Erweiterte Window-Typen fuer aeltere iOS-Versionen */
interface ExtendedWindow extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/**
 * iOS Audio-Manager (Singleton)
 *
 * Problem: iOS Safari blockiert Audio-Wiedergabe ohne User-Geste.
 * `new Audio(url).play()` schlaegt fehl wenn der AudioContext nicht
 * durch eine User-Interaktion "aufgeweckt" wurde.
 *
 * Loesung: Beim ersten Touch/Click wird ein stiller Buffer abgespielt,
 * der den AudioContext "freischaltet". Danach funktioniert
 * `playAudio()` ohne weitere User-Geste.
 *
 * Zusaetzlich: Re-Unlock nach Background-Return (iOS "interrupted" State).
 */
class IOSAudioManagerImpl {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private initialized = false;

  /** Wurde der AudioContext erfolgreich freigeschaltet? */
  get isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Ist der Manager initialisiert? */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialisiert den Audio-Manager.
   * Registriert Touch/Click-Listener fuer den Silent-Buffer-Unlock.
   * Idempotent — mehrfacher Aufruf ist sicher.
   */
  init(): void {
    if (this.initialized) return;
    if (typeof window === "undefined") return;

    this.initialized = true;

    const handler = async () => {
      if (this.unlocked) return;
      try {
        const win = window as ExtendedWindow;
        const ACtor = win.AudioContext || win.webkitAudioContext;
        if (!ACtor) return;

        const ctx = new ACtor();
        this.ctx = ctx;
        await ctx.resume();

        // Silent Buffer abspielen — "weckt" den AudioContext auf
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);

        this.unlocked = true;
      } catch {
        // AudioContext-Erstellung fehlgeschlagen — kein Fehler fuer den User
      }
    };

    // Listener fuer ersten Touch/Click
    ["touchend", "click"].forEach((e) =>
      document.addEventListener(e, handler, { once: true }),
    );

    // Re-Unlock nach Background-Return (iOS "interrupted" State)
    // iOS setzt den AudioContext in "interrupted" wenn die App im Hintergrund war
    this.setupBackgroundReUnlock(handler);
  }

  /**
   * Spielt Audio aus einem ArrayBuffer ab.
   * Nutzt AudioContext.decodeAudioData fuer zuverlaessige iOS-Kompatibilitaet.
   *
   * @param arrayBuffer - Audio-Daten (MP3, AAC, etc.)
   * @returns Promise das resolved wenn die Wiedergabe endet
   * @throws Error wenn AudioContext nicht freigeschaltet
   */
  async playAudio(arrayBuffer: ArrayBuffer): Promise<void> {
    if (!this.ctx || !this.unlocked) {
      // Fallback: Normales HTML Audio Element (funktioniert auf Desktop)
      throw new Error(
        "AudioContext nicht freigeschaltet — Fallback auf HTMLAudioElement noetig",
      );
    }

    // .slice(0) weil decodeAudioData den Buffer konsumiert (detached)
    const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    const source = this.ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(this.ctx.destination);

    return new Promise<void>((resolve, reject) => {
      source.onended = () => resolve();
      try {
        source.start(0);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Spielt Audio von einem Blob ab.
   * Konvertiert Blob → ArrayBuffer → AudioContext.
   *
   * @param blob - Audio-Blob (z.B. von TTS API)
   * @returns Promise das resolved wenn die Wiedergabe endet
   */
  async playBlob(blob: Blob): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();
    return this.playAudio(arrayBuffer);
  }

  /**
   * Prueft ob der AudioContext verfuegbar und freigeschaltet ist.
   * Kann als Guard vor playAudio/playBlob genutzt werden.
   */
  canPlay(): boolean {
    return this.unlocked && this.ctx !== null && this.ctx.state === "running";
  }

  /** Gibt alle Ressourcen frei */
  cleanup(): void {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // Ignorieren
      }
      this.ctx = null;
    }
    this.unlocked = false;
    this.initialized = false;
  }

  /**
   * Registriert statechange-Listener fuer Background-Return Re-Unlock.
   * iOS setzt AudioContext.state auf "interrupted" bei App-Suspend.
   */
  private setupBackgroundReUnlock(unlockHandler: () => Promise<void>): void {
    // Polling-basiert, da statechange erst nach ctx-Erstellung funktioniert
    const checkInterval = setInterval(() => {
      if (!this.ctx) return;

      // statechange Listener registrieren (nur einmal)
      this.ctx.addEventListener("statechange", () => {
        if (
          this.ctx?.state === "interrupted" ||
          this.ctx?.state === "suspended"
        ) {
          this.unlocked = false;
          // Neue Listener fuer Re-Unlock
          ["touchend", "click"].forEach((e) =>
            document.addEventListener(e, unlockHandler, { once: true }),
          );
        }
      });
      clearInterval(checkInterval);
    }, 100);

    // Cleanup: Interval nach 5 Sekunden beenden falls kein ctx
    setTimeout(() => clearInterval(checkInterval), 5000);
  }
}

// Singleton-Instanz
let instance: IOSAudioManagerImpl | null = null;

/**
 * Gibt die Singleton-Instanz des iOS Audio-Managers zurueck.
 * Erstellt die Instanz beim ersten Aufruf.
 */
export function getIOSAudioManager(): IOSAudioManagerImpl {
  if (!instance) {
    instance = new IOSAudioManagerImpl();
  }
  return instance;
}

/** Nur fuer Tests: Singleton zuruecksetzen */
export function resetIOSAudioManager(): void {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}

export type IOSAudioManager = IOSAudioManagerImpl;
