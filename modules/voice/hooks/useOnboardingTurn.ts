// modules/voice/hooks/useOnboardingTurn.ts
// Welle C C6 — Client-Hook fuer den Onboarding-Wizard.
//
// Spricht POST /api/ai/onboarding/turn (C5b) an. Haelt die Conversation-
// History client-seitig (die Route ist stateless). tool_results mit
// mode='confirm' werden in pendingConfirmations gepuffert; UI fragt den
// User (MemoryConfirmDialog) und ruft dann confirmMemory bzw.
// dismissConfirmation.
//
// Pre-Check-Befund (s. C5b-Handoff): KEINE neue /api/memory/confirm-Route,
// stattdessen die bestehende POST /api/memory/facts-Route, die den exakt
// gleichen Effekt hat (saveFact mit confirmed=true, Consent + Caregiver
// + Quota + Medical-Blocklist serverseitig).

"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import type { AIMessage } from "@/lib/ai/types";
import type { SaveMemoryResult } from "@/lib/ai/tools/save-memory";

export type OnboardingError = "unauthorized" | "ai_disabled" | "generic" | null;

export type PendingConfirmation = Extract<
  SaveMemoryResult,
  { ok: true; mode: "confirm" }
>;

interface TurnResponse {
  assistant_text: string;
  tool_results: SaveMemoryResult[];
  stop_reason: string;
}

export interface UseOnboardingTurnReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: OnboardingError;
  pendingConfirmations: PendingConfirmation[];
  sendUserInput: (text: string) => Promise<void>;
  confirmMemory: (item: PendingConfirmation) => Promise<void>;
  dismissConfirmation: (item: PendingConfirmation) => void;
  reset: () => void;
}

function isPendingConfirmation(
  result: SaveMemoryResult,
): result is PendingConfirmation {
  return result.ok === true && result.mode === "confirm";
}

export function useOnboardingTurn(): UseOnboardingTurnReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<OnboardingError>(null);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    PendingConfirmation[]
  >([]);

  const sendUserInput = useCallback(
    async (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai/onboarding/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, userInput: trimmed }),
        });

        if (res.status === 401) {
          setError("unauthorized");
          return;
        }
        if (res.status === 503) {
          setError("ai_disabled");
          return;
        }
        if (!res.ok) {
          setError("generic");
          toast.error(
            "Der KI-Assistent ist gerade nicht erreichbar. Bitte erneut versuchen.",
          );
          return;
        }

        const data = (await res.json()) as TurnResponse;

        // History fortschreiben:
        //  - User-Input immer.
        //  - Assistant-Text nur wenn nicht leer/whitespace
        //    (Codex-Review ZUSATZ-FUND B: tool-only-Responses haetten sonst
        //    leere Bubbles erzeugt).
        setMessages((prev) => {
          const next = [...prev, { role: "user" as const, content: trimmed }];
          const assistantText = data.assistant_text?.trim() ?? "";
          if (assistantText.length > 0) {
            next.push({ role: "assistant", content: data.assistant_text });
          }
          return next;
        });

        // Confirm-Tool-Results sammeln
        const newConfirms = (data.tool_results ?? []).filter(
          isPendingConfirmation,
        );
        if (newConfirms.length > 0) {
          setPendingConfirmations((prev) => [...prev, ...newConfirms]);
        }
      } catch {
        setError("generic");
        toast.error("Verbindungsfehler. Bitte erneut versuchen.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const confirmMemory = useCallback(async (item: PendingConfirmation) => {
    try {
      const res = await fetch("/api/memory/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: item.category,
          key: item.key,
          value: item.value,
        }),
      });

      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen.");
        return;
      }

      toast.success("Gespeichert.");
      // Reference-Equality (Codex-Review ZUSATZ-FUND D): zwei Confirmations
      // mit identischer category+key duerfen unabhaengig bestaetigt/verworfen
      // werden. Der Filter trifft genau die uebergebene Instanz.
      setPendingConfirmations((prev) => prev.filter((p) => p !== item));
    } catch {
      toast.error("Verbindungsfehler beim Speichern.");
    }
  }, []);

  const dismissConfirmation = useCallback((item: PendingConfirmation) => {
    setPendingConfirmations((prev) => prev.filter((p) => p !== item));
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setPendingConfirmations([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    pendingConfirmations,
    sendUserInput,
    confirmMemory,
    dismissConfirmation,
    reset,
  };
}
