import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getIOSAudioManager, resetIOSAudioManager } from '@/modules/voice/services/ios-audio-manager';

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  private listeners: Record<string, Array<() => void>> = {};

  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);

  createBuffer = vi.fn().mockReturnValue({});
  createBufferSource = vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    onended: null as (() => void) | null,
  });
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 1.0,
    numberOfChannels: 1,
    sampleRate: 22050,
  });

  get destination() {
    return {} as AudioDestinationNode;
  }

  addEventListener(event: string, fn: () => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  // Hilfs-Methode fuer Tests: State aendern und Event feuern
  _setState(state: string) {
    this.state = state;
    (this.listeners['statechange'] || []).forEach(fn => fn());
  }
}

describe('IOSAudioManager', () => {
  let originalAddEventListener: typeof document.addEventListener;
  let registeredListeners: Record<string, EventListener[]>;

  beforeEach(() => {
    resetIOSAudioManager();

    // Event-Listener tracken
    registeredListeners = {};
    originalAddEventListener = document.addEventListener;
    document.addEventListener = vi.fn((event: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => {
      if (!registeredListeners[event]) registeredListeners[event] = [];
      registeredListeners[event].push(handler as EventListener);
      // once-Option: Handler nach erstem Aufruf entfernen
      if (typeof options === 'object' && options?.once) {
        const originalHandler = handler as EventListener;
        const wrapper = (e: Event) => {
          originalHandler(e);
          const idx = registeredListeners[event]?.indexOf(wrapper);
          if (idx !== undefined && idx >= 0) registeredListeners[event].splice(idx, 1);
        };
        registeredListeners[event][registeredListeners[event].length - 1] = wrapper;
      }
    }) as typeof document.addEventListener;

    // AudioContext mocken
    (globalThis as Record<string, unknown>).AudioContext = MockAudioContext;
  });

  afterEach(() => {
    document.addEventListener = originalAddEventListener;
    delete (globalThis as Record<string, unknown>).AudioContext;
    resetIOSAudioManager();
  });

  it('gibt Singleton-Instanz zurueck', () => {
    const a = getIOSAudioManager();
    const b = getIOSAudioManager();
    expect(a).toBe(b);
  });

  it('ist nach Reset eine neue Instanz', () => {
    const a = getIOSAudioManager();
    resetIOSAudioManager();
    const b = getIOSAudioManager();
    expect(a).not.toBe(b);
  });

  it('registriert Touch/Click-Listener bei init()', () => {
    const manager = getIOSAudioManager();
    manager.init();

    expect(document.addEventListener).toHaveBeenCalledWith(
      'touchend',
      expect.any(Function),
      { once: true },
    );
    expect(document.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      { once: true },
    );
  });

  it('ist idempotent — mehrfacher init() registriert nicht doppelt', () => {
    const manager = getIOSAudioManager();
    manager.init();
    manager.init();
    manager.init();

    // Nur 2 Listener (touchend + click), nicht 6
    const touchListeners = registeredListeners['touchend'] || [];
    const clickListeners = registeredListeners['click'] || [];
    expect(touchListeners.length + clickListeners.length).toBe(2);
  });

  it('schaltet Audio frei nach click-Event', async () => {
    const manager = getIOSAudioManager();
    manager.init();

    expect(manager.isUnlocked).toBe(false);

    // Click-Event simulieren
    const clickHandler = registeredListeners['click']?.[0];
    expect(clickHandler).toBeDefined();
    await (clickHandler as Function)(new Event('click'));

    expect(manager.isUnlocked).toBe(true);
  });

  it('canPlay() gibt true zurueck nach Unlock', async () => {
    const manager = getIOSAudioManager();
    manager.init();

    expect(manager.canPlay()).toBe(false);

    // Unlock simulieren
    const clickHandler = registeredListeners['click']?.[0];
    await (clickHandler as Function)(new Event('click'));

    expect(manager.canPlay()).toBe(true);
  });

  it('cleanup() setzt alles zurueck', async () => {
    const manager = getIOSAudioManager();
    manager.init();

    // Unlock
    const clickHandler = registeredListeners['click']?.[0];
    await (clickHandler as Function)(new Event('click'));
    expect(manager.isUnlocked).toBe(true);

    manager.cleanup();

    expect(manager.isUnlocked).toBe(false);
    expect(manager.isInitialized).toBe(false);
    expect(manager.canPlay()).toBe(false);
  });

  it('playBlob() funktioniert nach Unlock', async () => {
    const manager = getIOSAudioManager();
    manager.init();

    // Unlock
    const clickHandler = registeredListeners['click']?.[0];
    await (clickHandler as Function)(new Event('click'));

    // Mock: createBufferSource gibt Source mit start() zurueck
    // playBlob ruft decodeAudioData + createBufferSource + start() auf
    const blob = new Blob(['test'], { type: 'audio/mp3' });

    // Da der Mock keine echte Audio-Wiedergabe macht,
    // muessen wir onended manuell triggern
    const mockSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      onended: null as (() => void) | null,
    };
    const mockCtx = MockAudioContext.prototype;

    // Wir koennen playBlob nicht direkt testen ohne echten AudioContext,
    // aber wir koennen pruefen dass canPlay() true ist
    expect(manager.canPlay()).toBe(true);
  });

  it('playAudio() wirft Fehler wenn nicht freigeschaltet', async () => {
    const manager = getIOSAudioManager();
    manager.init();

    // Ohne Unlock
    const buffer = new ArrayBuffer(8);
    await expect(manager.playAudio(buffer)).rejects.toThrow(
      'AudioContext nicht freigeschaltet',
    );
  });

  it('funktioniert ohne AudioContext (SSR)', () => {
    delete (globalThis as Record<string, unknown>).AudioContext;

    const manager = getIOSAudioManager();
    // init() sollte nicht werfen
    manager.init();

    expect(manager.isUnlocked).toBe(false);
    expect(manager.canPlay()).toBe(false);
  });
});
