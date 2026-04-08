"use client";

import { Linkify } from "./Linkify";

interface StreamingTextDisplayProps {
  text: string;
  isStreaming: boolean;
}

// StreamingTextDisplay — Zeigt KI-Antwort mit blinkenden Cursor während Streaming
export function StreamingTextDisplay({
  text,
  isStreaming,
}: StreamingTextDisplayProps) {
  return (
    <div className="whitespace-pre-wrap">
      <Linkify text={text} />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[#4CAF87] animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  );
}
