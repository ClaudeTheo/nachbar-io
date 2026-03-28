// components/companion/ChatInputArea.tsx
// Eingabebereich: Textarea, Mikrofon-Button, Senden-Button, Aufnahme-Indikator

import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SpeechEngineState } from "../../engines/speech-engine";

interface ChatInputAreaProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  sending: boolean;
  recording: boolean;
  speechState: SpeechEngineState;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
  onToggleRecording: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function ChatInputArea({
  inputValue,
  setInputValue,
  sending,
  recording,
  speechState,
  inputRef,
  onSend,
  onToggleRecording,
  onKeyDown,
}: ChatInputAreaProps) {
  return (
    <>
      {/* Aufnahme-Indikator */}
      {recording && (
        <div
          data-testid="recording-indicator"
          className="flex items-center justify-center gap-2 border-t border-border bg-red-50 px-4 py-2"
        >
          <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-700">
            {speechState === "processing" ? "Verarbeite..." : "Ich hoere zu..."}
          </span>
        </div>
      )}

      {/* Eingabefeld */}
      <div className="border-t border-border bg-warmwhite px-4 pt-3 pb-4">
        <div className="flex items-end gap-2">
          {/* Mikrofon-Button */}
          <Button
            data-testid="companion-mic"
            onClick={onToggleRecording}
            size="icon"
            variant={recording ? "destructive" : "outline"}
            className={`h-11 w-11 shrink-0 rounded-full ${
              recording
                ? ""
                : "border-border text-muted-foreground hover:text-quartier-green"
            }`}
            aria-label={recording ? "Aufnahme stoppen" : "Spracheingabe"}
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Text-Eingabe */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Fragen Sie den Quartier-Lotsen..."
            data-testid="companion-input"
            rows={1}
            maxLength={1000}
            disabled={sending}
            className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green disabled:opacity-50"
            style={{ minHeight: "2.75rem", maxHeight: "7rem" }}
            onInput={(e) => {
              // Auto-Resize
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 112) + "px";
            }}
          />

          {/* Senden-Button */}
          <Button
            onClick={onSend}
            disabled={sending || !inputValue.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full bg-quartier-green hover:bg-quartier-green/90 disabled:opacity-40"
            aria-label="Nachricht senden"
            data-testid="companion-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
