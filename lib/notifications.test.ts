// Nachbar.io — Tests fuer das Benachrichtigungssystem
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase Client Mock
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

// Fetch Mock fuer Push-API
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

// Import NACH den Mocks
import { createNotification } from "./notifications";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "admin-user-id" } } });
});

describe("createNotification", () => {
  it("erstellt In-App Notification und sendet Push", async () => {
    await createNotification({
      userId: "target-user-id",
      type: "alert",
      title: "Neue Meldung",
      body: "Wasserschaden in Nr. 5",
    });

    // Supabase Insert wurde aufgerufen
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "target-user-id",
        type: "alert",
        title: "Neue Meldung",
        body: "Wasserschaden in Nr. 5",
      })
    );

    // Push-API wurde aufgerufen
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/push/notify",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("verhindert Self-Notify (eigene userId)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "same-user-id" } } });

    await createNotification({
      userId: "same-user-id",
      type: "alert",
      title: "Test",
    });

    // Kein Insert bei Self-Notify
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("setzt optionale Felder auf null wenn nicht angegeben", async () => {
    await createNotification({
      userId: "target-user-id",
      type: "system",
      title: "System-Hinweis",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        body: null,
        reference_id: null,
        reference_type: null,
      })
    );
  });

  it("konstruiert korrekte Push-URL aus Typ und Referenz", async () => {
    await createNotification({
      userId: "target-user-id",
      type: "alert",
      title: "Meldung",
      referenceId: "alert-123",
      referenceType: "alert",
    });

    // Push-Fetch sollte URL mit /alerts/alert-123 enthalten
    const pushCall = mockFetch.mock.calls[0];
    const pushBody = JSON.parse(pushCall[1].body);
    expect(pushBody.url).toBe("/alerts/alert-123");
  });

  it("schluckt Fehler still (fire-and-forget)", async () => {
    mockInsert.mockRejectedValueOnce(new Error("DB-Fehler"));

    // Sollte nicht werfen
    await expect(
      createNotification({
        userId: "target-user-id",
        type: "alert",
        title: "Test",
      })
    ).resolves.toBeUndefined();
  });
});
