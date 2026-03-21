'use client';

// components/VoiceAssistantFAB.tsx
// Nachbar.io — Floating Action Button fuer den KI-Sprach-Assistenten
// Nutzt Web Speech API + /api/voice/assistant fuer Klassifizierung
// Senior-Mode: 56px Button, Bottom-Sheet fuer Ergebnis-Anzeige

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Loader2, HelpCircle, AlertTriangle, MapPin, MessageCircle, Navigation, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import type { AssistantAction, AssistantResult } from '@/lib/voice/assistant-classify';

// Web Speech API Typen (nicht in allen TS-Konfigurationen enthalten)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/** Zustaende des FAB */
type FabState = 'idle' | 'listening' | 'processing';

/** Prueft ob die Web Speech API verfuegbar ist */
function isSpeechRecognitionAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

/** Erstellt eine SpeechRecognition-Instanz (mit webkit-Fallback) */
function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor() as SpeechRecognitionLike;
}

/** Aktions-Konfiguration fuer das Bottom-Sheet */
interface ActionConfig {
  icon: React.ReactNode;
  label: string;
  buttonLabel: string;
  route: string;
}

const ACTION_CONFIG: Partial<Record<AssistantAction, ActionConfig>> = {
  help_request: {
    icon: <HelpCircle className="h-6 w-6 text-[#4CAF87]" />,
    label: 'Hilfsanfrage',
    buttonLabel: 'Hilfsanfrage erstellen',
    route: '/care/tasks',
  },
  report_issue: {
    icon: <AlertTriangle className="h-6 w-6 text-[#F59E0B]" />,
    label: 'Mängelmelder',
    buttonLabel: 'Mangel melden',
    route: '/city-services',
  },
  find_neighbor: {
    icon: <Search className="h-6 w-6 text-[#4CAF87]" />,
    label: 'Nachbarn finden',
    buttonLabel: 'Zum Marktplatz',
    route: '/marketplace',
  },
  general: {
    icon: <MessageCircle className="h-6 w-6 text-[#2D3142]" />,
    label: 'Allgemeine Anfrage',
    buttonLabel: 'Verstanden',
    route: '',
  },
};

export function VoiceAssistantFAB() {
  const router = useRouter();
  const [state, setState] = useState<FabState>('idle');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aufraumen bei Unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignorieren */ }
      }
    };
  }, []);

  // Ergebnis verarbeiten: Navigation oder Sheet oeffnen
  const handleResult = useCallback(
    (assistantResult: AssistantResult, spokenText: string) => {
      const { action, params } = assistantResult;

      // Notfall: Sofort zur Alert-Seite
      if (action === 'emergency_info') {
        router.push('/alerts');
        setState('idle');
        return;
      }

      // Navigation: Sofort navigieren, Toast anzeigen
      if (action === 'navigate' && params.route) {
        router.push(params.route);
        toast.success(assistantResult.message || 'Navigation...');
        setState('idle');
        return;
      }

      // Alle anderen: Sheet oeffnen
      setResult(assistantResult);
      setTranscript(spokenText);
      setSheetOpen(true);
      setState('idle');
    },
    [router]
  );

  // API-Aufruf nach Spracherkennung
  const classifyText = useCallback(
    async (text: string) => {
      setState('processing');
      try {
        const res = await fetch('/api/voice/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          throw new Error(`API-Fehler: ${res.status}`);
        }

        const data: AssistantResult = await res.json();
        handleResult(data, text);
      } catch (err) {
        console.error('[VoiceAssistantFAB] Klassifizierung fehlgeschlagen:', err);
        toast.error('Sprachassistent konnte die Anfrage nicht verarbeiten.');
        setState('idle');
      }
    },
    [handleResult]
  );

  // Stille-Timer: 15 Sekunden
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignorieren */ }
      }
    }, 15_000);
  }, []);

  // Aufnahme starten
  const startListening = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setState('listening');
      resetSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      resetSilenceTimer();
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (text) {
            classifyText(text);
          } else {
            setState('idle');
          }
          return;
        }
      }
    };

    recognition.onerror = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setState('idle');
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    try {
      recognition.start();
    } catch {
      setState('idle');
    }
  }, [classifyText, resetSilenceTimer]);

  // Aufnahme stoppen
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignorieren */ }
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // Klick-Handler: Toggle Aufnahme
  const handleClick = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'idle') {
      startListening();
    }
    // Bei processing: nichts tun
  }, [state, startListening, stopListening]);

  // Aktions-Button im Sheet: Zur passenden Route navigieren
  const handleSheetAction = useCallback(() => {
    if (!result) return;
    const config = ACTION_CONFIG[result.action];
    if (config?.route) {
      router.push(config.route);
    }
    setSheetOpen(false);
    setResult(null);
  }, [result, router]);

  // Graceful Degradation: Nichts rendern wenn API nicht verfuegbar
  if (!isSpeechRecognitionAvailable()) {
    return null;
  }

  // FAB-Styling je nach Zustand
  const fabClasses = [
    'fixed bottom-24 right-4 z-40',
    'flex items-center justify-center rounded-full shadow-lg',
    'transition-all hover:scale-110 active:scale-95',
    state === 'idle' && 'bg-[#4CAF87]',
    state === 'listening' && 'bg-red-500 animate-pulse',
    state === 'processing' && 'bg-[#F59E0B]',
  ]
    .filter(Boolean)
    .join(' ');

  const ariaLabel = state === 'listening' ? 'Aufnahme stoppen' : 'Sprachassistent';
  const config = result ? ACTION_CONFIG[result.action] : null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleClick}
        className={fabClasses}
        style={{ minWidth: '56px', minHeight: '56px', touchAction: 'manipulation' }}
        aria-label={ariaLabel}
        data-testid="voice-assistant-fab"
      >
        {state === 'idle' && <Mic className="h-6 w-6 text-white" />}
        {state === 'listening' && <MicOff className="h-6 w-6 text-white" />}
        {state === 'processing' && <Loader2 className="h-6 w-6 text-white animate-spin" />}
      </button>

      {/* Ergebnis-Sheet von unten */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[#2D3142]">
              {config?.icon}
              {config?.label || 'Sprachassistent'}
            </SheetTitle>
            <SheetDescription>
              {result?.message || 'Verarbeitung...'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Transkript anzeigen */}
            {transcript && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground italic">
                „{transcript}"
              </div>
            )}

            {/* Aktions-Button (Senior-Mode: gross + gruen) */}
            {config?.route && (
              <button
                onClick={handleSheetAction}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-base transition-all hover:bg-[#4CAF87]/90 active:scale-95"
                style={{ minHeight: '56px', touchAction: 'manipulation' }}
              >
                <Navigation className="h-5 w-5" />
                {config.buttonLabel}
              </button>
            )}

            {/* Schliessen-Button */}
            <button
              onClick={() => {
                setSheetOpen(false);
                setResult(null);
              }}
              className="w-full flex items-center justify-center rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
              style={{ minHeight: '48px', touchAction: 'manipulation' }}
            >
              Schließen
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
