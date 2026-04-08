// components/companion/TTSButton.tsx
// Vorlesen-Button — nur für Plus/Pro Nutzer (Pilot: alle freigeschalten)
// Session 59: iOS Audio-Manager Integration fuer zuverlaessige Wiedergabe

'use client';

import { useState, useRef, useCallback } from 'react';
import { Volume2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getIOSAudioManager } from '../../services/ios-audio-manager';

interface TTSButtonProps {
  text: string;
}

// Pilot-Modus: TTS für alle Nutzer freigeschalten
const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === 'true';

/**
 * Spricht den übergebenen Text via OpenAI TTS vor.
 * Feature-Gate: In der Pilot-Phase ist TTS für alle Nutzer verfügbar.
 * Nach Pilot: Nur Plus/Pro Nutzer (useSubscription-Check).
 *
 * Nutzt den iOS Audio-Manager fuer zuverlaessige Wiedergabe auf iOS Safari.
 * Fallback auf HTMLAudioElement wenn AudioContext nicht verfuegbar (Desktop).
 *
 * TODO: Feature-Gate nach Pilot-Phase — useSubscription() einbinden
 * und Free-Nutzer mit Upgrade-Hinweis blockieren.
 */
export function TTSButton({ text }: TTSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Feature-Gate: Im Pilot-Modus ist TTS für alle freigeschaltet.
  // Nach Pilot: useSubscription() prüfen (Plus/Pro erforderlich).
  const isTtsAvailable = PILOT_MODE || true; // TODO: nach Pilot → useSubscription().plan !== 'free'

  const handlePlay = useCallback(async () => {
    // Wenn bereits abspielend → stoppen
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 1000) }),
      });

      if (!res.ok) {
        throw new Error(`TTS-Fehler: ${res.status}`);
      }

      const blob = await res.blob();

      // iOS Audio-Manager versuchen (zuverlaessiger auf iOS Safari)
      const audioManager = getIOSAudioManager();
      if (audioManager.canPlay()) {
        setPlaying(true);
        try {
          await audioManager.playBlob(blob);
        } finally {
          setPlaying(false);
        }
        return;
      }

      // Fallback: HTMLAudioElement (Desktop-Browser)
      const url = URL.createObjectURL(blob);

      // Vorheriges Audio aufräumen
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        // Verzögertes Revoke — Safari kann bei sofortigem Revoke abbrechen
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      };

      audio.onerror = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        toast.error('Wiedergabefehler.');
      };

      await audio.play().catch(() => {
        // Safari/iOS blockiert audio.play() ohne User-Geste oder bei stummem Modus
        toast.error('Wiedergabe blockiert — bitte prüfen Sie den Lautstärke-/Stummschalter.');
        URL.revokeObjectURL(url);
        throw new Error('play blocked');
      });
      setPlaying(true);
    } catch {
      toast.error('Sprachausgabe nicht verfügbar.');
    } finally {
      setLoading(false);
    }
  }, [text, playing]);

  // Gesperrte Anzeige für Free-Nutzer (nach Pilot-Phase)
  if (!isTtsAvailable) {
    return (
      <Button
        data-testid="tts-button-locked"
        variant="ghost"
        size="sm"
        disabled
        className="mt-1 h-8 gap-1 text-xs text-muted-foreground opacity-60"
        aria-label="Vorlesen — nur mit QuartierApp Plus"
      >
        <Lock className="h-3.5 w-3.5" />
        Vorlesen — mit QuartierApp Plus
      </Button>
    );
  }

  return (
    <Button
      data-testid="tts-button"
      variant="ghost"
      size="sm"
      onClick={handlePlay}
      disabled={loading || !text}
      className="mt-1 h-8 gap-1 text-xs text-muted-foreground hover:text-quartier-green"
      aria-label="Vorlesen"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {playing ? 'Stoppen' : 'Vorlesen'}
    </Button>
  );
}
