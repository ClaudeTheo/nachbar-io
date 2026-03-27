// components/voice/SpeakerAnimation.tsx
// Pulsierender Lautsprecher während TTS-Ausgabe

import { Volume2 } from 'lucide-react';

interface SpeakerAnimationProps {
  isPlaying: boolean;
}

export function SpeakerAnimation({ isPlaying }: SpeakerAnimationProps) {
  return (
    <div
      data-testid="speaker-animation"
      className={`flex justify-center py-6 ${isPlaying ? 'animate-pulse' : ''}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Äußerer Ring */}
        <div
          className={`absolute h-20 w-20 rounded-full bg-[#4CAF87]/10 transition-transform duration-500 ${
            isPlaying ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        />
        {/* Mittlerer Ring */}
        <div
          className={`absolute h-14 w-14 rounded-full bg-[#4CAF87]/20 transition-transform duration-300 ${
            isPlaying ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        />
        {/* Icon */}
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#4CAF87]">
          <Volume2 className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
