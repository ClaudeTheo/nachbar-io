// __tests__/modules/chat/send-message-notify.test.ts
// Welle S2 (C2:3): sendMessage benachrichtigt den Empfaenger (Notification +
// Push) — aber DATENSPARSAM: nur der Vorname des Absenders, NIEMALS der
// Nachrichteninhalt im Payload.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { safeInsertNotification, sendPush } = vi.hoisted(() => ({
  safeInsertNotification: vi.fn(
    (_client: unknown, _payload: Record<string, unknown>) =>
      Promise.resolve({ success: true, usedFallback: false }),
  ),
  sendPush: vi.fn((_client: unknown, _payload: Record<string, unknown>) =>
    Promise.resolve(true),
  ),
}));

vi.mock("@/lib/notifications-server", () => ({ safeInsertNotification }));
vi.mock("@/modules/care/services/channels/push", () => ({ sendPush }));

// service_role-Client (createClient aus supabase-js): liefert den Absender-Namen
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { display_name: "Maria Beispiel" } }),
        }),
      }),
    }),
  }),
}));

import { sendMessage } from "@/modules/chat/services/messages.service";

const SENDER = "sender-1";
const RECIPIENT = "recipient-2";
const CONV = "conv-9";
const SECRET_CONTENT = "Dies ist ein geheimer Nachrichtentext";

// User-scoped Client: conversation-Lookup, Insert, last_message_at-Update.
function makeUserClient() {
  return {
    from: (table: string) => {
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { participant_1: SENDER, participant_2: RECIPIENT },
              }),
            }),
          }),
          update: () => ({ eq: async () => ({}) }),
        };
      }
      // direct_messages
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: "msg-1",
                conversation_id: CONV,
                sender_id: SENDER,
                content: SECRET_CONTENT,
                created_at: "2026-06-13T10:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      };
    },
  };
}

beforeEach(() => {
  safeInsertNotification.mockClear();
  sendPush.mockClear();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendMessage — Empfaenger-Benachrichtigung (S2/C2:3)", () => {
  it("erzeugt eine Notification fuer den Empfaenger mit Typ 'message'", async () => {
    await sendMessage(makeUserClient() as never, SENDER, CONV, {
      content: SECRET_CONTENT,
    });

    expect(safeInsertNotification).toHaveBeenCalledTimes(1);
    const payload = safeInsertNotification.mock.calls[0][1];
    expect(payload.user_id).toBe(RECIPIENT);
    expect(payload.type).toBe("message");
  });

  it("schreibt NIEMALS den Nachrichteninhalt in Notification oder Push", async () => {
    await sendMessage(makeUserClient() as never, SENDER, CONV, {
      content: SECRET_CONTENT,
    });

    const notifyPayload = JSON.stringify(safeInsertNotification.mock.calls[0][1]);
    const pushPayload = JSON.stringify(sendPush.mock.calls[0][1]);
    expect(notifyPayload).not.toContain(SECRET_CONTENT);
    expect(pushPayload).not.toContain(SECRET_CONTENT);
    // Stattdessen nur der Vorname des Absenders
    expect(notifyPayload).toContain("Maria");
    expect(notifyPayload).not.toContain("Beispiel"); // nur Vorname, kein Nachname
  });

  it("benachrichtigt den anderen Teilnehmer, nicht den Absender", async () => {
    await sendMessage(makeUserClient() as never, SENDER, CONV, {
      content: "Hallo",
    });

    expect(sendPush.mock.calls[0][1].userId).toBe(RECIPIENT);
  });
});
