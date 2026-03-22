'use client'

interface StreamingTextDisplayProps {
  text: string
  isStreaming: boolean
}

// StreamingTextDisplay — Zeigt KI-Antwort mit blinkenden Cursor waehrend Streaming
export function StreamingTextDisplay({ text, isStreaming }: StreamingTextDisplayProps) {
  return (
    <div className="whitespace-pre-wrap">
      {text}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[#4CAF87] animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  )
}
