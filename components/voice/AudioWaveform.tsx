'use client';

// components/voice/AudioWaveform.tsx
// Echtzeit Audio-Waveform — 16 Balken, Quartier-Gruen
// Gauss-artige Verteilung: Mitte-Balken reagieren staerker

import { useMemo } from 'react';

interface AudioWaveformProps {
  audioLevel: number;  // 0-1, normalisierter Audio-Pegel
  isActive: boolean;   // Aufnahme laeuft
}

const BAR_COUNT = 16;
const MIN_HEIGHT = 4;  // px
const MAX_HEIGHT = 40; // px

export function AudioWaveform({ audioLevel, isActive }: AudioWaveformProps) {
  // Balken-Hoehen berechnen: Mitte hoeher, Raender niedriger (Wellenform-Effekt)
  const barHeights = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const distance = Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
      const multiplier = 1 - distance * 0.6;
      // Deterministische Variation pro Balken (kein Math.random fuer Tests)
      const variation = 1 + Math.sin(i * 1.7) * 0.15;
      const height = MIN_HEIGHT + audioLevel * multiplier * variation * (MAX_HEIGHT - MIN_HEIGHT);
      return Math.max(MIN_HEIGHT, Math.round(height));
    });
  }, [audioLevel]);

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ minHeight: '48px' }}
      data-testid="waveform-container"
    >
      <div className="flex items-end justify-center gap-[3px]" style={{ height: '48px' }}>
        {barHeights.map((height, i) => (
          <div
            key={i}
            data-testid="waveform-bar"
            className={`w-[4px] rounded-full bg-[#4CAF87] transition-all duration-75 ${
              !isActive ? 'animate-pulse' : ''
            }`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">Ich höre zu...</span>
    </div>
  );
}
