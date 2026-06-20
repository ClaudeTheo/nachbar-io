// modules/care/hooks/useOpenCaregiverChat.ts
// Welle S2 (Befund C2:1): Oeffnet einen 1:1-Chat, indem zuerst die Konversation
// aufgeloest wird (find-or-create ueber den passenden Care-Endpoint) und dann
// nach /chat/{conversationId} navigiert wird.
//
// Vorher verlinkten mehrere Stellen faelschlich direkt auf /messages/{userId} —
// eine User-ID, wo eine Konversations-ID erwartet wird. Der Link lief ins Leere
// ("Konversation nicht gefunden").
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface OpenChatState {
  /** Ziel-User-ID, deren Konversation gerade aufgeloest wird (Lade-Indikator) */
  pendingId: string | null;
  error: string | null;
}

export interface UseOpenChatResult {
  openChat: (targetUserId: string) => Promise<void>;
  pendingId: string | null;
  error: string | null;
}

/**
 * Geteilter Kern: loest die 1:1-Konversation ueber den angegebenen Care-Endpoint
 * auf (POST { [idKey]: targetUserId } -> { conversation_id }) und navigiert nach
 * /chat/{conversationId}. Bei Fehler/403 wird eine Meldung gesetzt, NICHT
 * navigiert.
 */
function useOpenDirectChat(endpoint: string, idKey: string): UseOpenChatResult {
  const router = useRouter();
  const [state, setState] = useState<OpenChatState>({
    pendingId: null,
    error: null,
  });

  const openChat = useCallback(
    async (targetUserId: string) => {
      setState({ pendingId: targetUserId, error: null });
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [idKey]: targetUserId }),
        });
        const data = (await res.json().catch(() => null)) as {
          conversation_id?: string;
          error?: string;
        } | null;

        if (!res.ok || !data?.conversation_id) {
          // Klare Meldung statt stillem Klick ins Leere — deckt u.a. den
          // 403-Fall ab (Verknuepfung widerrufen / verschiedene Quartiere /
          // fehlendes Abo bei der Angehoerigen-Richtung).
          setState({
            pendingId: null,
            error: data?.error ?? "Der Chat konnte nicht geöffnet werden.",
          });
          return;
        }

        router.push(`/chat/${data.conversation_id}`);
        // pendingId zuruecksetzen: bei erfolgreicher Navigation unmountet die
        // Komponente ohnehin; wirft die Zielseite den Nutzer aber zurueck
        // (z.B. RLS auf /chat/[id]), bliebe der Button sonst dauerhaft disabled.
        setState({ pendingId: null, error: null });
      } catch {
        setState({
          pendingId: null,
          error: "Der Chat konnte nicht geöffnet werden.",
        });
      }
    },
    [router, endpoint, idKey],
  );

  return { openChat, pendingId: state.pendingId, error: state.error };
}

/** Bewohner -> verbundener Angehoeriger (kein Abo noetig). */
export function useOpenCaregiverChat(): UseOpenChatResult {
  return useOpenDirectChat("/api/care/contact/chat", "caregiver_id");
}

/** Angehoeriger (Plus) -> betreuter Bewohner. */
export function useOpenResidentChat(): UseOpenChatResult {
  return useOpenDirectChat("/api/caregiver/chat", "resident_id");
}
