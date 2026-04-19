// modules/voice/components/onboarding/WizardChat.tsx
// Welle C C6 — KI-Wizard-Chat (Text-Input MVP).
//
// Komposition:
//   - useOnboardingTurn  -> Conversation gegen /api/ai/onboarding/turn
//   - useTtsPlayback     -> Auto-Play der Assistant-Antwort
//   - MemoryConfirmDialog -> Bestaetigungs-Dialog fuer mode='confirm'
//
// MVP: Text-Input + Senden-Button. STT-Mikrofon kommt in C6b.
// Senior-Mode: 80px Touch-Targets, hohe Schrift, kontrastreiche Farben.

"use client";

import { useEffect, useRef, useState } from "react";
import { useOnboardingTurn } from "@/modules/voice/hooks/useOnboardingTurn";
import { useTtsPlayback } from "@/modules/voice/hooks/useTtsPlayback";
import { MemoryConfirmDialog } from "@/modules/voice/components/onboarding/MemoryConfirmDialog";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  ai_disabled:
    "Der KI-Assistent ist gerade nicht verfuegbar. Bitte versuchen Sie es spaeter erneut.",
  unauthorized: "Bitte melden Sie sich an, um den KI-Assistenten zu nutzen.",
  generic: "Etwas ist schiefgegangen. Bitte versuchen Sie es erneut.",
};

export function WizardChat() {
  const {
    messages,
    isLoading,
    error,
    pendingConfirmations,
    sendUserInput,
    confirmMemory,
    dismissConfirmation,
  } = useOnboardingTurn();
  const { play } = useTtsPlayback();

  const [input, setInput] = useState("");
  const lastSpokenIndexRef = useRef<number>(-1);

  // Auto-Play TTS bei neuer Assistant-Antwort
  useEffect(() => {
    if (messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const last = messages[lastIndex];
    if (last.role !== "assistant") return;
    if (lastIndex === lastSpokenIndexRef.current) return;
    lastSpokenIndexRef.current = lastIndex;
    void play(last.content);
  }, [messages, play]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendUserInput(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const firstPending = pendingConfirmations[0] ?? null;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Chat-History */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-lg text-[#2D3142]/60">
            Sagen oder schreiben Sie mir etwas ueber sich, damit ich Sie
            kennenlernen kann.
          </div>
        )}
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "self-end max-w-[80%] rounded-2xl bg-[#4CAF87] px-4 py-3 text-lg text-white"
                  : "self-start max-w-[85%] rounded-2xl bg-[#F3F4F6] px-4 py-3 text-lg text-[#2D3142]"
              }
            >
              {m.content}
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="mt-3 self-start text-base text-[#2D3142]/60">
            Einen Moment...
          </div>
        )}
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="mx-4 mb-2 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-base text-[#2D3142]">
          {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.generic}
        </div>
      )}

      {/* Eingabe */}
      <div className="border-t border-[#2D3142]/10 bg-white p-4">
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Antwort..."
            disabled={isLoading}
            aria-label="Ihre Antwort"
            className="flex-1 rounded-xl border border-[#2D3142]/20 bg-white px-4 py-3 text-lg text-[#2D3142] outline-none focus:border-[#4CAF87]"
            style={{ minHeight: "80px" }}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={isLoading || input.trim().length === 0}
            className="rounded-xl bg-[#4CAF87] px-6 text-lg font-semibold text-white hover:bg-[#4CAF87]/90"
            style={{ minHeight: "80px", touchAction: "manipulation" }}
          >
            Senden
          </Button>
        </div>
      </div>

      {/* Confirm-Dialog */}
      <MemoryConfirmDialog
        item={firstPending}
        onConfirm={() => firstPending && void confirmMemory(firstPending)}
        onCancel={() => firstPending && dismissConfirmation(firstPending)}
      />
    </div>
  );
}
