// modules/care/services/logger-sentry.test.ts
// Nachbar.io — Tests fuer die Sentry-Bridge des Care-Loggers (R7, Architektur-Review 2026-07-04)
// Jeder log.error() muss in Sentry landen (Fehler-Aggregation fuer SOS-kritische Pfade),
// aber OHNE Metadata/userId — beforeSend redigiert `extra` nicht (DSGVO).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const captureExceptionMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

import { createCareLogger } from "./logger";

describe("createCareLogger — Sentry-Bridge", () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("meldet error() an Sentry mit Original-Error und Kontext-Tags", () => {
    const log = createCareLogger("care/sos", "req-sentry-1");
    const original = new Error("Connection timeout");
    log.error("db_insert_failed", original);

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [err, context] = captureExceptionMock.mock.calls[0] as [
      Error,
      { tags?: Record<string, string> },
    ];
    expect(err).toBe(original);
    expect(context.tags).toEqual({
      care_route: "care/sos",
      care_event: "db_insert_failed",
      request_id: "req-sentry-1",
    });
  });

  it("verpackt Nicht-Error-Werte in einen Error mit Event-Kontext", () => {
    const log = createCareLogger("care/checkin", "req-sentry-2");
    log.error("unknown_error", "string error");

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [err] = captureExceptionMock.mock.calls[0] as [Error];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("unknown_error: string error");
  });

  it("sendet KEINE Metadata und KEINE userId an Sentry (DSGVO)", () => {
    const log = createCareLogger("care/sos", "req-sentry-3");
    log.error(
      "db_insert_failed",
      new Error("boom"),
      { medicalNote: "sensibel", email: "a@b.de" },
      { userId: "user-uuid-123" },
    );

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(captureExceptionMock.mock.calls[0][1]);
    expect(serialized).not.toContain("sensibel");
    expect(serialized).not.toContain("a@b.de");
    expect(serialized).not.toContain("user-uuid-123");
    expect(serialized).not.toContain("medicalNote");
  });

  it("meldet info() und warn() NICHT an Sentry", () => {
    const log = createCareLogger("care/sos", "req-sentry-4");
    log.info("sos_triggered", { userId: "u1" });
    log.warn("audit_log_failed", { checkinId: "ci-1" });
    log.done(200);

    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("bricht das Console-Logging nicht ab, wenn Sentry wirft", () => {
    captureExceptionMock.mockImplementationOnce(() => {
      throw new Error("sentry down");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const log = createCareLogger("care/sos", "req-sentry-5");
    expect(() => log.error("db_insert_failed", new Error("boom"))).not.toThrow();

    // Der strukturierte JSON-Log muss trotzdem erscheinen
    const jsonCalls = errorSpy.mock.calls.filter((c) => {
      try {
        return JSON.parse(c[0] as string).event === "db_insert_failed";
      } catch {
        return false;
      }
    });
    expect(jsonCalls.length).toBe(1);
  });
});
