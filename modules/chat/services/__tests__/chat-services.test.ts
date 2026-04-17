import { describe, it, expect, vi } from "vitest";
import { sendContactRequest, updateContactStatus } from "../contacts.service";
import { getOrCreateConversation } from "../conversations.service";
import { sendMessage } from "../messages.service";
import { createGroup, sendGroupMessage } from "../chat-groups.service";
import { createSignedUploadUrl } from "../media-upload.service";
import { ServiceError } from "@/lib/services/service-error";

// Kleiner Mock-Helper — baut einen Supabase-Chain-Mock. Reicht fuer die
// Validierungs-Pfade, die vor echten DB-Calls greifen.
function mockSupabase(
  overrides: Partial<{
    maybeSingleResult: unknown;
    singleResult: unknown;
    singleError: unknown;
    insertError: unknown;
    storageResult: { signedUrl: string; token: string };
  }> = {},
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({
        data: overrides.maybeSingleResult ?? null,
        error: null,
      }),
    single: vi.fn().mockResolvedValue({
      data: overrides.singleResult ?? null,
      error: overrides.singleError ?? null,
    }),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUploadUrl: vi.fn().mockResolvedValue({
          data: overrides.storageResult ?? { signedUrl: "x", token: "y" },
          error: null,
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "z" },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://example.test/x" },
        }),
      }),
    },
  } as unknown as Parameters<typeof sendContactRequest>[0];
}

describe("contacts.service", () => {
  describe("sendContactRequest", () => {
    it("lehnt Self-Request ab", async () => {
      const sb = mockSupabase();
      await expect(sendContactRequest(sb, "u1", "u1")).rejects.toThrow(
        ServiceError,
      );
      await expect(sendContactRequest(sb, "u1", "u1")).rejects.toMatchObject({
        status: 400,
        code: "self_contact_request",
      });
    });

    it("lehnt zu lange Note ab", async () => {
      const sb = mockSupabase();
      const longNote = "x".repeat(281);
      await expect(
        sendContactRequest(sb, "u1", "u2", longNote),
      ).rejects.toMatchObject({ status: 400, code: "note_too_long" });
    });

    it("akzeptiert Note bis 280 Zeichen", async () => {
      const sb = mockSupabase({
        singleResult: {
          requester_id: "u1",
          addressee_id: "u2",
          status: "pending",
          note: null,
          created_at: "now",
          accepted_at: null,
        },
      });
      const note = "x".repeat(280);
      await expect(
        sendContactRequest(sb, "u1", "u2", note),
      ).resolves.toBeDefined();
    });

    it("wandelt Reverse-Request automatisch in accepted", async () => {
      const sb = mockSupabase({
        maybeSingleResult: {
          requester_id: "u2",
          addressee_id: "u1",
          status: "pending",
        },
        singleResult: {
          requester_id: "u2",
          addressee_id: "u1",
          status: "accepted",
          note: null,
          created_at: "now",
          accepted_at: "now",
        },
      });
      const result = await sendContactRequest(sb, "u1", "u2");
      expect(result.status).toBe("accepted");
    });

    it("lehnt bei Block in Reverse-Richtung ab", async () => {
      const sb = mockSupabase({
        maybeSingleResult: {
          requester_id: "u2",
          addressee_id: "u1",
          status: "blocked",
        },
      });
      await expect(sendContactRequest(sb, "u1", "u2")).rejects.toMatchObject({
        status: 403,
        code: "contact_blocked",
      });
    });
  });

  describe("updateContactStatus", () => {
    it("Requester kann nur rejecten (cancel)", async () => {
      const sb = mockSupabase();
      await expect(
        updateContactStatus(sb, "u1", "u1", "u2", "accepted"),
      ).rejects.toMatchObject({ status: 400, code: "invalid_transition" });
      await expect(
        updateContactStatus(sb, "u1", "u1", "u2", "blocked"),
      ).rejects.toMatchObject({ status: 400, code: "invalid_transition" });
    });

    it("Non-Teilnehmer wird abgelehnt", async () => {
      const sb = mockSupabase();
      await expect(
        updateContactStatus(sb, "u3", "u1", "u2", "accepted"),
      ).rejects.toMatchObject({ status: 403, code: "not_participant" });
    });
  });
});

describe("conversations.service", () => {
  describe("getOrCreateConversation", () => {
    it("lehnt Self-Conversation ab", async () => {
      const sb = mockSupabase();
      await expect(
        getOrCreateConversation(sb, "u1", "u1"),
      ).rejects.toMatchObject({ status: 400, code: "self_conversation" });
    });

    it("liefert bestehende Konversation ohne INSERT", async () => {
      const sb = mockSupabase({
        maybeSingleResult: {
          id: "c1",
          participant_1: "u1",
          participant_2: "u2",
          last_message_at: null,
          created_at: "now",
          quarter_id: null,
        },
      });
      const conv = await getOrCreateConversation(sb, "u2", "u1");
      expect(conv.id).toBe("c1");
    });

    it("mappt RLS-Policy-Fehler auf no_accepted_contact (403)", async () => {
      const sb = mockSupabase({
        maybeSingleResult: null,
        singleError: { code: "42501", message: "new row violates policy" },
      });
      await expect(
        getOrCreateConversation(sb, "u1", "u2"),
      ).rejects.toMatchObject({ status: 403, code: "no_accepted_contact" });
    });
  });
});

describe("messages.service", () => {
  describe("sendMessage Validierung", () => {
    it("lehnt leere Nachricht (kein content, kein media) ab", async () => {
      const sb = mockSupabase();
      await expect(sendMessage(sb, "u1", "c1", {})).rejects.toMatchObject({
        status: 400,
        code: "empty_message",
      });
    });

    it("lehnt Content > 4000 Zeichen ab", async () => {
      const sb = mockSupabase();
      await expect(
        sendMessage(sb, "u1", "c1", { content: "x".repeat(4001) }),
      ).rejects.toMatchObject({ status: 400, code: "content_too_long" });
    });

    it("lehnt media_url ohne media_type ab", async () => {
      const sb = mockSupabase();
      await expect(
        sendMessage(sb, "u1", "c1", { media_url: "https://x" }),
      ).rejects.toMatchObject({ status: 400, code: "media_type_missing" });
    });

    it("lehnt Audio ohne duration ab", async () => {
      const sb = mockSupabase();
      await expect(
        sendMessage(sb, "u1", "c1", {
          media_url: "https://x",
          media_type: "audio",
        }),
      ).rejects.toMatchObject({ status: 400, code: "audio_duration_missing" });
    });

    it("lehnt Audio > 60 Sekunden ab", async () => {
      const sb = mockSupabase();
      await expect(
        sendMessage(sb, "u1", "c1", {
          media_url: "https://x",
          media_type: "audio",
          media_duration_sec: 61,
        }),
      ).rejects.toMatchObject({ status: 400, code: "audio_too_long" });
    });

    it("404 wenn Konversation nicht existiert", async () => {
      const sb = mockSupabase({ maybeSingleResult: null });
      await expect(
        sendMessage(sb, "u1", "c-nope", { content: "hi" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("403 wenn User nicht Teilnehmer ist", async () => {
      const sb = mockSupabase({
        maybeSingleResult: { participant_1: "u2", participant_2: "u3" },
      });
      await expect(
        sendMessage(sb, "u1", "c1", { content: "hi" }),
      ).rejects.toMatchObject({ status: 403, code: "not_participant" });
    });
  });
});

describe("chat-groups.service", () => {
  describe("createGroup Validierung", () => {
    it("lehnt leeren Namen ab", async () => {
      const sb = mockSupabase();
      await expect(createGroup(sb, "u1", "  ")).rejects.toMatchObject({
        status: 400,
        code: "name_required",
      });
    });

    it("lehnt Namen > 80 Zeichen ab", async () => {
      const sb = mockSupabase();
      await expect(createGroup(sb, "u1", "x".repeat(81))).rejects.toMatchObject(
        { status: 400, code: "name_too_long" },
      );
    });

    it("lehnt description > 500 Zeichen ab", async () => {
      const sb = mockSupabase();
      await expect(
        createGroup(sb, "u1", "Gruppe", "x".repeat(501)),
      ).rejects.toMatchObject({ status: 400, code: "description_too_long" });
    });
  });

  describe("sendGroupMessage Validierung", () => {
    it("lehnt leere Nachricht ab", async () => {
      const sb = mockSupabase();
      await expect(sendGroupMessage(sb, "u1", "g1", {})).rejects.toMatchObject({
        status: 400,
        code: "empty_message",
      });
    });

    it("lehnt Audio > 60 Sek ab", async () => {
      const sb = mockSupabase();
      await expect(
        sendGroupMessage(sb, "u1", "g1", {
          media_url: "https://x",
          media_type: "audio",
          media_duration_sec: 90,
        }),
      ).rejects.toMatchObject({ status: 400, code: "audio_too_long" });
    });
  });
});

describe("media-upload.service", () => {
  describe("createSignedUploadUrl", () => {
    it("lehnt ungueltigen MIME-Typ ab", async () => {
      const sb = mockSupabase();
      await expect(
        createSignedUploadUrl(sb, {
          scope: "direct",
          ownerId: "c1",
          mimeType: "application/pdf",
        }),
      ).rejects.toMatchObject({ status: 400, code: "unsupported_mime" });
    });

    it("lehnt ungueltigen scope ab", async () => {
      const sb = mockSupabase();
      await expect(
        createSignedUploadUrl(sb, {
          scope: "something" as "direct",
          ownerId: "c1",
          mimeType: "image/png",
        }),
      ).rejects.toMatchObject({ status: 400, code: "invalid_scope" });
    });

    it("baut Pfad mit korrekter Extension fuer image/webp", async () => {
      const sb = mockSupabase({
        storageResult: { signedUrl: "sig", token: "tok" },
      });
      const result = await createSignedUploadUrl(sb, {
        scope: "direct",
        ownerId: "c1",
        mimeType: "image/webp",
      });
      expect(result.path).toMatch(/^direct\/c1\/[\w-]+\.webp$/);
      expect(result.token).toBe("tok");
    });

    it("baut Pfad mit chat/ Prefix fuer Gruppen", async () => {
      const sb = mockSupabase({
        storageResult: { signedUrl: "sig", token: "tok" },
      });
      const result = await createSignedUploadUrl(sb, {
        scope: "chat",
        ownerId: "g1",
        mimeType: "audio/webm",
      });
      expect(result.path).toMatch(/^chat\/g1\/[\w-]+\.webm$/);
    });
  });
});
