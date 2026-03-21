'use client';

// components/VoiceAssistantFAB.tsx
// Nachbar.io — Floating Action Button fuer den KI-Sprach-Assistenten
// Redesign: Hybrid Speech Engine, AudioWaveform, Dialog-Flow (B+)

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Loader2, HelpCircle, AlertTriangle, MessageCircle, Navigation, Search, RotateCcw, X, Volume2, VolumeX } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { createSpeechEngine } from '@/lib/voice/create-speech-engine';
import { AudioWaveform } from '@/components/voice/AudioWaveform';
import { SpeakerAnimation } from '@/components/voice/SpeakerAnimation';
import type { SpeechEngine, SpeechEngineCallbacks } from '@/lib/voice/speech-engine';
import type { AssistantAction, AssistantResult } from '@/lib/voice/assistant-classify';

/** Sheet-Zustaende */
type SheetState = 'closed' | 'idle' | 'recording' | 'processing' | 'speaking' | 'result' | 'error';

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
  set_help_offers: {
    icon: <HelpCircle className="h-6 w-6 text-[#4CAF87]" />,
    label: 'Hilfsangebote',
    buttonLabel: 'Zum Profil',
    route: '/profile',
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
  // Engine lazy initialisieren (vor erstem Render verfuegbar)
  const engineRef = useRef<SpeechEngine | null | undefined>(undefined);
  if (engineRef.current === undefined) {
    engineRef.current = createSpeechEngine();
  }

  // State
  const [sheetState, setSheetState] = useState<SheetState>('closed');
  const [audioLevel, setAudioLevel] = useState(0);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previousAction, setPreviousAction] = useState<{ action: string; transcript: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Push-to-Talk: Startzeitpunkt fuer Mindestdauer-Pruefung
  const recordingStartTimeRef = useRef<number>(0);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      engineRef.current?.cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // API-Aufruf nach Transkription
  const classifyText = useCallback(
    async (text: string, prevAction?: { action: string; transcript: string } | null) => {
      setSheetState('processing');
      setAudioLevel(0);

      try {
        const body: Record<string, unknown> = { text };
        if (prevAction) {
          body.previousAction = prevAction;
        }

        const res = await fetch('/api/voice/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`API-Fehler: ${res.status}`);
        }

        const data: AssistantResult = await res.json();

        // Notfall: Sofort navigieren
        if (data.action === 'emergency_info') {
          router.push('/alerts');
          setSheetState('closed');
          return;
        }

        // Navigation: Sofort navigieren
        if (data.action === 'navigate' && data.params.route) {
          router.push(data.params.route);
          toast.success(data.message || 'Navigation...');
          setSheetState('closed');
          return;
        }

        // Hilfsangebote setzen: Skills in Supabase speichern
        if (data.action === 'set_help_offers') {
          const skills = data.params.skills;
          if (Array.isArray(skills) && skills.length > 0) {
            try {
              const supabase = createClient();
              const { data: userData } = await supabase.auth.getUser();
              const user = userData?.user;
              if (user) {
                // Bestehende Skills laden um Duplikate zu vermeiden
                const { data: existing } = await supabase
                  .from('skills')
                  .select('category')
                  .eq('user_id', user.id);
                const existingCats = new Set((existing ?? []).map((s: { category: string }) => s.category));
                const newSkills = skills.filter((s: string) => !existingCats.has(s));

                if (newSkills.length > 0) {
                  const { data: quarter } = await supabase
                    .from('quarter_memberships')
                    .select('quarter_id')
                    .eq('user_id', user.id)
                    .single();

                  const inserts = newSkills.map((cat: string) => ({
                    user_id: user.id,
                    quarter_id: quarter?.quarter_id,
                    category: cat,
                    is_public: true,
                  }));
                  await supabase.from('skills').insert(inserts);
                }
              }
            } catch (err) {
              console.error('[VoiceAssistantFAB] Skills speichern fehlgeschlagen:', err);
            }
          }
        }

        // Ergebnis speichern + TTS starten
        setResult(data);
        setTranscript(text);
        setSheetState('speaking');

        // TTS: Antwort vorlesen
        const ttsText = data.spokenResponse || data.message;
        try {
          const ttsRes = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: ttsText }),
          });

          if (ttsRes.ok) {
            const audioBlob = await ttsRes.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setSheetState('result');
            };

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setSheetState('result');
            };

            await audio.play();
          } else {
            // TTS fehlgeschlagen — direkt zu result
            setSheetState('result');
          }
        } catch {
          // TTS fehlgeschlagen — direkt zu result
          setSheetState('result');
        }
      } catch (err) {
        console.error('[VoiceAssistantFAB] Klassifizierung fehlgeschlagen:', err);
        setErrorMessage('Sprachassistent konnte die Anfrage nicht verarbeiten.');
        setSheetState('error');
      }
    },
    [router]
  );

  // Engine starten
  const startRecording = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    setSheetState('recording');
    setAudioLevel(0);
    setErrorMessage('');

    const callbacks: SpeechEngineCallbacks = {
      onTranscript: (text: string) => {
        classifyText(text, previousAction);
      },
      onAudioLevel: (level: number) => {
        setAudioLevel(level);
      },
      onStateChange: () => {
        // State wird ueber sheetState gesteuert
      },
      onError: (message: string) => {
        const userMessage = message.includes('not-allowed') || message.includes('Mikrofon')
          ? 'Bitte Mikrofon freigeben in den Browser-Einstellungen.'
          : 'Spracherkennung nicht verfügbar.';
        setErrorMessage(userMessage);
        setSheetState('error');
      },
    };

    engine.startListening(callbacks);
  }, [classifyText, previousAction]);

  // Engine stoppen
  const stopRecording = useCallback(() => {
    engineRef.current?.stopListening();
  }, []);

  // FAB-Klick: Sheet oeffnen im idle-State (Push-to-Talk)
  const handleFabClick = useCallback(() => {
    if (sheetState === 'closed') {
      setPreviousAction(null);
      setSheetState('idle');
    }
  }, [sheetState]);

  // Push-to-Talk: Druecken startet Aufnahme
  const handlePushStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault(); // Ghost-Clicks verhindern
    recordingStartTimeRef.current = Date.now();
    startRecording();
    // Haptisches Feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [startRecording]);

  // Push-to-Talk: Loslassen stoppt Aufnahme (mit Mindestdauer-Pruefung)
  const handlePushEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    if (sheetState !== 'recording') return;
    const elapsed = Date.now() - recordingStartTimeRef.current;
    if (elapsed < 500) {
      // Zu kurz — abbrechen
      engineRef.current?.stopListening();
      setSheetState('idle');
      setAudioLevel(0);
      toast.error('Bitte etwas länger gedrückt halten');
    } else {
      stopRecording();
    }
  }, [sheetState, stopRecording]);

  // Sprachausgabe stoppen
  const handleStopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSheetState('result');
  }, []);

  // "Nochmal sprechen": Vorherige Aktion speichern, zurueck zum idle-State
  const handleRetry = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (result && transcript) {
      setPreviousAction({ action: result.action, transcript });
    }
    setResult(null);
    setTranscript('');
    setSheetState('idle');
  }, [result, transcript]);

  // Aktions-Button: Navigieren + Sheet schliessen
  const handleAction = useCallback(() => {
    if (!result) return;
    const config = ACTION_CONFIG[result.action];
    if (config?.route) {
      router.push(config.route);
    }
    setSheetState('closed');
    setResult(null);
    setPreviousAction(null);
  }, [result, router]);

  // Sheet schliessen
  const handleClose = useCallback(() => {
    engineRef.current?.stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSheetState('closed');
    setResult(null);
    setTranscript('');
    setPreviousAction(null);
    setAudioLevel(0);
  }, []);

  // Nichts rendern wenn keine Engine verfuegbar
  if (!engineRef.current) {
    return null;
  }

  const sheetOpen = sheetState !== 'closed';
  const config = result ? ACTION_CONFIG[result.action] : null;

  return (
    <>
      {/* Floating Action Button — immer gruen */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-24 right-4 z-40 flex items-center justify-center rounded-full shadow-lg bg-[#4CAF87] transition-all hover:scale-110 active:scale-95"
        style={{ minWidth: '56px', minHeight: '56px', touchAction: 'manipulation' }}
        aria-label="Sprachassistent"
        data-testid="voice-assistant-fab"
      >
        <Mic className="h-6 w-6 text-white" />
      </button>

      {/* Bottom-Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[#2D3142]">
              {sheetState === 'idle' && (
                <>
                  <Mic className="h-5 w-5 text-[#4CAF87]" />
                  Sprachassistent
                </>
              )}
              {sheetState === 'recording' && (
                <>
                  <Mic className="h-5 w-5 text-[#4CAF87]" />
                  Sprachassistent
                </>
              )}
              {sheetState === 'processing' && (
                <>
                  <Loader2 className="h-5 w-5 text-[#F59E0B] animate-spin" />
                  Verarbeite...
                </>
              )}
              {sheetState === 'speaking' && (
                <>
                  <Volume2 className="h-5 w-5 text-[#4CAF87]" />
                  Sprachausgabe
                </>
              )}
              {sheetState === 'result' && (
                <>
                  {config?.icon}
                  {config?.label || 'Sprachassistent'}
                </>
              )}
              {sheetState === 'error' && (
                <>
                  <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                  Mikrofon-Fehler
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {sheetState === 'idle' && 'Bereit zum Sprechen'}
              {sheetState === 'recording' && 'Sprechen Sie jetzt...'}
              {sheetState === 'processing' && 'Ihre Anfrage wird analysiert...'}
              {sheetState === 'speaking' && (result?.spokenResponse || result?.message || '')}
              {sheetState === 'result' && (result?.message || '')}
              {sheetState === 'error' && errorMessage}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* IDLE: Push-to-Talk Button */}
            {sheetState === 'idle' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <button
                  data-testid="push-to-talk-btn"
                  onMouseDown={handlePushStart}
                  onMouseUp={handlePushEnd}
                  onMouseLeave={handlePushEnd}
                  onTouchStart={handlePushStart}
                  onTouchEnd={handlePushEnd}
                  className="flex items-center justify-center rounded-full bg-[#4CAF87] text-white shadow-lg select-none"
                  style={{ width: '120px', height: '120px', touchAction: 'none' }}
                  aria-label="Gedrückt halten zum Sprechen"
                >
                  <Mic className="h-12 w-12" />
                </button>
                <p className="text-base text-[#2D3142] font-medium text-center">
                  Halten Sie gedrückt zum Sprechen
                </p>
              </div>
            )}

            {/* RECORDING: Push-to-Talk aktiv (pulsierender Button + Waveform) */}
            {sheetState === 'recording' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative flex items-center justify-center">
                  {/* Pulsierender Ring */}
                  <div className="absolute rounded-full bg-[#4CAF87]/20 animate-pulse" style={{ width: '150px', height: '150px' }} />
                  <button
                    data-testid="push-to-talk-btn"
                    onMouseUp={handlePushEnd}
                    onMouseLeave={handlePushEnd}
                    onTouchEnd={handlePushEnd}
                    className="relative flex items-center justify-center rounded-full bg-[#4CAF87] text-white shadow-lg select-none"
                    style={{ width: '130px', height: '130px', touchAction: 'none' }}
                    aria-label="Loslassen zum Senden"
                  >
                    <Mic className="h-14 w-14" />
                  </button>
                </div>
                <p className="text-base text-[#4CAF87] font-medium text-center">
                  Lassen Sie los zum Senden
                </p>
                <AudioWaveform audioLevel={audioLevel} isActive={true} />
              </div>
            )}

            {/* PROCESSING: Spinner */}
            {sheetState === 'processing' && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 text-[#F59E0B] animate-spin" />
              </div>
            )}

            {/* SPEAKING: Lautsprecher-Animation + Text + Stopp */}
            {sheetState === 'speaking' && (
              <>
                <SpeakerAnimation isPlaying={true} />
                <p className="text-center text-lg font-medium text-[#2D3142]">
                  {result?.spokenResponse || result?.message}
                </p>
                <button
                  onClick={handleStopSpeaking}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: '48px', touchAction: 'manipulation' }}
                >
                  <VolumeX className="h-5 w-5" />
                  Vorlesen stoppen
                </button>
              </>
            )}

            {/* RESULT: Ergebnis + Buttons */}
            {sheetState === 'result' && (
              <>
                {/* Transkript */}
                {transcript && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground italic">
                    „{transcript}"
                  </div>
                )}

                {/* Aktions-Button (Senior-Mode: gross + gruen) */}
                {config?.route && (
                  <button
                    onClick={handleAction}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-base transition-all hover:bg-[#4CAF87]/90 active:scale-95"
                    style={{ minHeight: '56px', touchAction: 'manipulation' }}
                  >
                    <Navigation className="h-5 w-5" />
                    {config.buttonLabel}
                  </button>
                )}

                {/* Nochmal sprechen */}
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#4CAF87] text-[#4CAF87] font-medium text-base transition-all hover:bg-[#4CAF87]/10 active:scale-95"
                  style={{ minHeight: '48px', touchAction: 'manipulation' }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Nochmal sprechen
                </button>

                {/* Schliessen */}
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: '48px', touchAction: 'manipulation' }}
                >
                  <X className="h-4 w-4" />
                  Schließen
                </button>
              </>
            )}

            {/* ERROR: Fehler + Schliessen */}
            {sheetState === 'error' && (
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                style={{ minHeight: '48px', touchAction: 'manipulation' }}
              >
                Schließen
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
