'use client'

interface AutoListenIndicatorProps {
  isListening: boolean
  audioLevel: number // 0-1
}

// Pulsierender Ring + Text fuer den Dialog-Modus (wenn KI zuhoert)
// Senior-Modus: 80px Mindesthoehe
export function AutoListenIndicator({ isListening, audioLevel }: AutoListenIndicatorProps) {
  if (!isListening) return null

  // Ring-Scale basiert auf audioLevel (1.0 = Basis, max 1.5 bei vollem Audio)
  const scale = 1 + audioLevel * 0.5

  return (
    <div
      data-testid="listen-indicator"
      className="flex flex-col items-center justify-center gap-3 min-h-[80px] py-4"
    >
      {/* Pulsierender gruener Ring */}
      <div className="relative flex items-center justify-center">
        <div
          data-testid="pulse-ring"
          className="w-16 h-16 rounded-full border-4 border-[#4CAF87] transition-transform duration-200"
          style={{ transform: `scale(${scale})`, opacity: 0.6 + audioLevel * 0.4 }}
        />
        {/* Innerer Punkt */}
        <div className="absolute w-4 h-4 rounded-full bg-[#4CAF87] animate-pulse" />
      </div>

      <p className="text-sm text-[#2D3142]/70 font-medium">
        Ich höre zu...
      </p>
    </div>
  )
}
