import { beforeEach, describe, expect, it } from "vitest";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";
import { acknowledgeSeniorReminder } from "@/modules/care/services/senior-kiosk.service";

// Welle SB-4: Autorisierungs-Logik der „Gesehen"-Quittung.
// Setzt acknowledged_at via Admin-Client (RLS-UPDATE bewusst nicht geoeffnet)
// mit eigenen Checks: verifiziertes Haushaltsmitglied + acknowledged_at IS NULL.
// Erfolg -> Push an created_by OHNE Zettel-Inhalt (Datensparsamkeit).

const admin = createRouteMockSupabase();
const USER = "user-senior";
const REMINDER = "11111111-1111-1111-1111-111111111111";

function reminderRow(over: Record<string, unknown> = {}) {
  return {
    id: REMINDER,
    household_id: "hh-1",
    created_by: "creator-1",
    type: "sticky",
    acknowledged_at: null,
    ...over,
  };
}

describe("acknowledgeSeniorReminder (SB-4)", () => {
  beforeEach(() => admin.reset());

  it("wirft 404 wenn der Zettel nicht existiert", async () => {
    admin.addResponse("kiosk_reminders", { data: null, error: null });
    await expect(
      acknowledgeSeniorReminder(admin.supabase, USER, REMINDER),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("wirft 403 wenn der User kein verifiziertes Haushaltsmitglied ist", async () => {
    admin.addResponse("kiosk_reminders", { data: reminderRow(), error: null });
    admin.addResponse("household_members", { data: null, error: null });
    await expect(
      acknowledgeSeniorReminder(admin.supabase, USER, REMINDER),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("wirft 409 wenn der Zettel bereits quittiert ist", async () => {
    admin.addResponse("kiosk_reminders", {
      data: reminderRow({ acknowledged_at: "2026-06-17T08:00:00Z" }),
      error: null,
    });
    admin.addResponse("household_members", { data: { user_id: USER }, error: null });
    await expect(
      acknowledgeSeniorReminder(admin.supabase, USER, REMINDER),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("quittiert und schickt eine inhaltslose Quittung an den Ersteller", async () => {
    admin.addResponse("kiosk_reminders", { data: reminderRow(), error: null });
    admin.addResponse("household_members", { data: { user_id: USER }, error: null });
    admin.addResponse("kiosk_reminders", { data: { id: REMINDER }, error: null }); // update.select
    admin.addResponse("notifications", { data: null, error: null }); // safeInsertNotification
    admin.addResponse("push_subscriptions", { data: [], error: null }); // sendPush -> keine Subs

    const result = await acknowledgeSeniorReminder(admin.supabase, USER, REMINDER);
    expect(result).toEqual({ acknowledged: true });

    const notifCall = admin.fromCalls.find((c) => c.table === "notifications");
    expect(notifCall).toBeDefined();
    const insertArgs = notifCall!.args.find((a) => a[0] === "insert")?.[1] as Record<
      string,
      unknown
    >;
    expect(insertArgs.user_id).toBe("creator-1");
    // Datensparsamkeit: keine Body-/Inhaltsfelder, Titel ohne Zettel-Text
    expect(insertArgs.body).toBeUndefined();
    expect(String(insertArgs.title)).toMatch(/gesehen/i);
  });

  it("schickt keine Quittung wenn der Quittierende selbst der Ersteller ist", async () => {
    admin.addResponse("kiosk_reminders", {
      data: reminderRow({ created_by: USER }),
      error: null,
    });
    admin.addResponse("household_members", { data: { user_id: USER }, error: null });
    admin.addResponse("kiosk_reminders", { data: { id: REMINDER }, error: null });

    const result = await acknowledgeSeniorReminder(admin.supabase, USER, REMINDER);
    expect(result).toEqual({ acknowledged: true });
    expect(admin.fromCalls.find((c) => c.table === "notifications")).toBeUndefined();
  });
});
