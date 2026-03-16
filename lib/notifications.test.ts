// Nachbar.io — Tests fuer das Benachrichtigungssystem
import { describe, it, expect, vi, beforeEach } from "vitest";

// Fetch Mock fuer Server-API
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import NACH den Mocks
import { createNotification } from "./notifications";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
});

describe("createNotification", () => {
  it("sendet POST an /api/notifications/create mit allen Parametern", async () => {
    await createNotification({
      userId: "target-user-id",
      type: "alert",
      title: "Neue Meldung",
      body: "Wasserschaden in Nr. 5",
      referenceId: "alert-123",
      referenceType: "alert",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notifications/create",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    // Body pruefen
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toEqual({
      userId: "target-user-id",
      type: "alert",
      title: "Neue Meldung",
      body: "Wasserschaden in Nr. 5",
      referenceId: "alert-123",
      referenceType: "alert",
    });
  });

  it("sendet nur Pflichtfelder wenn optionale nicht angegeben", async () => {
    await createNotification({
      userId: "target-user-id",
      type: "system",
      title: "System-Hinweis",
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toEqual({
      userId: "target-user-id",
      type: "system",
      title: "System-Hinweis",
    });
    // Optionale Felder sind nicht im Body
    expect(callBody.body).toBeUndefined();
    expect(callBody.referenceId).toBeUndefined();
  });

  it("loggt Fehler bei Server-Fehlerantwort (nicht werfen)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "DB-Fehler" }),
    });

    // Sollte nicht werfen (fire-and-forget)
    await expect(
      createNotification({
        userId: "target-user-id",
        type: "alert",
        title: "Test",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[notifications]"),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it("schluckt Netzwerk-Fehler still (fire-and-forget)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network Error"));

    await expect(
      createNotification({
        userId: "target-user-id",
        type: "alert",
        title: "Test",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[notifications] createNotification fehlgeschlagen"),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("loggt Fehler wenn response.json() fehlschlaegt", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("invalid json")),
    });

    await expect(
      createNotification({
        userId: "target-user-id",
        type: "alert",
        title: "Test",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[notifications]"),
      502
    );
    consoleSpy.mockRestore();
  });
});
