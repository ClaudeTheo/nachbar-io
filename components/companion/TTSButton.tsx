// components/companion/TTSButton.tsx
// Vorlesen-Button — nur fuer Plus/Pro Nutzer (Pilot: alle freigeschalten)

'use client';

import { useState, useRef, useCallback } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TTSButtonProps {
  text: string;
}

/**
 * Spricht den uebergebenen Text via OpenAI TTS vor.
 * In der Pilot-Phase ist TTS fuer alle Nutzer verfuegbar.
 * Spaeter: Nur Plus/Pro (useSubscription-Check einbauen).
 */
export function TTSButton({ text }: TTSButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      const url = URL.createObjectURL(blob);

      // Vorheriges Audio aufraeumen
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        toast.error('Wiedergabefehler.');
      };

      await audio.play();
      setPlaying(true);
    } catch {
      toast.error('Sprachausgabe nicht verfuegbar.');
    } finally {
      setLoading(false);
    }
  }, [text, playing]);

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
