// __tests__/lib/security/service-error-idor.test.ts
// Unit-Tests fuer IDOR-Detection in handleServiceError

import { describe, it, expect, vi, beforeEach } from "vitest";

// IDOR-Module mocken
vi.mock("@/lib/security/traps/trap-utils", () => ({
  buildClientKeysNode: vi.fn().mockReturnValue({
    ipHash: "test123",
    userId: null,
    sessionHash: null,
  }),
}));
vi.mock("@/lib/security/traps/idor-detector", () => ({
  recordIdorAttempt: vi.fn().mockResolvedValue(undefined),
}));

import { ServiceError, handleServiceError } from "@/lib/services/service-error";
import { buildClientKeysNode } from "@/lib/security/traps/trap-utils";
import { recordIdorAttempt } from "@/lib/security/traps/idor-detector";

function mockNextRequest(): any {
  return {
    headers: {
      get: (name: string) => {
        if (name === "x-forwarded-for") return "1.2.3.4";
        return null;
      },
    },
  };
}

describe("handleServiceError mit IDOR-Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt korrekte HTTP-Response fuer ServiceError", () => {
    const error = new ServiceError("Nicht gefunden", 404);
    const response = handleServiceError(error);
    expect(response.status).toBe(404);
  });

  it("gibt 500 fuer unbekannte Fehler", () => {
    const response = handleServiceError(new Error("random"));
    expect(response.status).toBe(500);
  });

  it("triggert IDOR bei 403 mit Request", async () => {
    const error = new ServiceError("Zugriff verweigert", 403);
    const req = mockNextRequest();

    handleServiceError(error, req, "/api/care/medications/[id]");

    // vi.waitFor wartet bis Assertion erfuellt (robuster als setTimeout)
    await vi.waitFor(() => {
      expect(buildClientKeysNode).toHaveBeenCalledWith(req);
      expect(recordIdorAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ ipHash: "test123" }),
        "/api/care/medications/[id]",
      );
    });
  });

  it("triggert IDOR bei 404 mit Request", async () => {
    const error = new ServiceError("Nicht gefunden", 404);
    const req = mockNextRequest();

    handleServiceError(error, req, "/api/groups/[id]");

    await vi.waitFor(() => {
      expect(recordIdorAttempt).toHaveBeenCalled();
    });
  });

  it("triggert KEINE IDOR bei 400 (Bad Request)", async () => {
    const error = new ServiceError("Ungueltig", 400);
    const req = mockNextRequest();

    handleServiceError(error, req, "/api/care/medications/[id]");

    // Kurz warten damit fire-and-forget haette triggern koennen
    await vi.advanceTimersByTimeAsync?.(50).catch(() => {});
    await new Promise((r) => setTimeout(r, 50));

    expect(recordIdorAttempt).not.toHaveBeenCalled();
  });

  it("triggert KEINE IDOR ohne Request-Parameter", async () => {
    const error = new ServiceError("Nicht gefunden", 404);

    handleServiceError(error); // Kein Request → kein IDOR

    await new Promise((r) => setTimeout(r, 50));

    expect(recordIdorAttempt).not.toHaveBeenCalled();
  });

  it("triggert KEINE IDOR ohne routePattern", async () => {
    const error = new ServiceError("Nicht gefunden", 404);
    const req = mockNextRequest();

    handleServiceError(error, req); // Kein Pattern → kein IDOR

    await new Promise((r) => setTimeout(r, 50));

    expect(recordIdorAttempt).not.toHaveBeenCalled();
  });
});
