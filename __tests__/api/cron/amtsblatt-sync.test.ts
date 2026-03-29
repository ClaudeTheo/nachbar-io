// __tests__/api/cron/amtsblatt-sync.test.ts
// Integrationstests fuer den Amtsblatt-Sync Cron-Job (PDF + Claude Haiku)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Env-Vars
vi.stubEnv("CRON_SECRET", "test-cron-secret-123");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");

// Konfigurierbare Mock-Daten
let mockQuarter: { id: string } | null = { id: "q-bs" };
let mockExistingIssues: { id: string }[] = [];
let mockInsertedIssue: { id: string } | null = { id: "issue-1" };
let mockInsertError: { message: string } | null = null;

// Supabase-Mock
function makeAmtsblattSupabase() {
  return {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.or = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);

      chain.single = vi.fn().mockImplementation(() => {
        if (table === "quarters") {
          return Promise.resolve({ data: mockQuarter, error: null });
        }
        if (table === "amtsblatt_issues") {
          return Promise.resolve({
            data: mockInsertedIssue,
            error: mockInsertError,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      chain.insert = vi.fn().mockImplementation(() => {
        if (table === "municipal_announcements") {
          return Promise.resolve({ data: null, error: null });
        }
        // amtsblatt_issues insert → chain weiter fuer .select().single()
        return chain;
      });

      chain.then = (resolve: (v: { data: unknown[]; error: null }) => void) => {
        if (table === "amtsblatt_issues") {
          return resolve({ data: mockExistingIssues, error: null });
        }
        return resolve({ data: [], error: null });
      };

      return chain;
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => makeAmtsblattSupabase()),
}));

// Amtsblatt-Utilities Mock
const mockExtractPdfUrls = vi
  .fn()
  .mockReturnValue([
    "https://bad-saeckingen.de/amtsblatt/Amtsblatt_2026_06.pdf",
  ]);
const mockParseFilename = vi.fn().mockReturnValue({
  year: 2026,
  issueNumber: "06",
});
const mockExtractText = vi.fn().mockResolvedValue({
  text: "Samstag, 15. Maerz 2026\n\nBekanntmachung: Bauarbeiten in der Hauptstrasse ab 01.04.2026. Kontakt: Bauamt Bad Saeckingen.",
  pages: 4,
});
const mockBuildPrompt = vi.fn().mockReturnValue("Extrahiere Meldungen...");
const mockParseResponse = vi.fn().mockReturnValue([
  {
    title: "Bauarbeiten Hauptstrasse",
    body: "Ab 01.04.2026 wird die Hauptstrasse saniert.",
    category: "bauvorhaben",
    event_date: "2026-04-01",
  },
]);

vi.mock("@/lib/municipal/amtsblatt", () => ({
  AMTSBLATT_PAGE_URL: "https://bad-saeckingen.de/amtsblatt",
  EXTRACTION_SYSTEM_PROMPT: "Du extrahierst Meldungen...",
  extractPdfUrls: (...args: unknown[]) => mockExtractPdfUrls(...args),
  parseAmtsblattFilename: (...args: unknown[]) => mockParseFilename(...args),
  extractTextFromPdf: (...args: unknown[]) => mockExtractText(...args),
  buildExtractionPrompt: (...args: unknown[]) => mockBuildPrompt(...args),
  parseExtractionResponse: (...args: unknown[]) => mockParseResponse(...args),
}));

// Globaler fetch-Mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/api/cron/amtsblatt-sync", {
    headers: headers ?? {},
  });
}

describe("Cron: Amtsblatt-Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Env-Vars explizit setzen (vi.stubEnv am Top-Level reicht nicht,
    // weil der Test an Zeile 170 process.env.ANTHROPIC_API_KEY loescht)
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.CRON_SECRET = "test-cron-secret-123";
    mockQuarter = { id: "q-bs" };
    mockExistingIssues = [];
    mockInsertedIssue = { id: "issue-1" };
    mockInsertError = null;

    // Standard-Fetch-Responses: HTML-Seite, PDF-Download, Claude API
    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes("bad-saeckingen.de/amtsblatt") &&
        !url.endsWith(".pdf")
      ) {
        // HTML-Seite
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              '<html><a href="Amtsblatt_2026_06.pdf">PDF</a></html>',
            ),
        });
      }
      if (url.endsWith(".pdf")) {
        // PDF-Download
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });
      }
      if (url.includes("api.anthropic.com")) {
        // Claude API
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: '[{"title":"Test","body":"Body","category":"info"}]',
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  });

  // --- Auth-Tests ---

  it("gibt 401 ohne Authorization-Header", async () => {
    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("gibt 401 mit falschem Secret", async () => {
    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(makeRequest({ Authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("gibt 500 wenn CRON_SECRET fehlt", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const mod = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await mod.GET(makeRequest());
    expect(res.status).toBe(500);
    vi.stubEnv("CRON_SECRET", "test-cron-secret-123");
  });

  it("gibt 500 wenn ANTHROPIC_API_KEY fehlt", async () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("ANTHROPIC_API_KEY");

    process.env.ANTHROPIC_API_KEY = origKey;
  });

  // --- Logik-Tests ---

  it("gibt imported=0 wenn keine PDFs gefunden", async () => {
    mockExtractPdfUrls.mockReturnValueOnce([]);

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.announcements_imported).toBe(0);
  });

  it("ueberspringt bereits importierte Ausgaben (Duplikat-Check)", async () => {
    mockExistingIssues = [{ id: "existing-1" }];

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.announcements_imported).toBe(0);
    // extractTextFromPdf sollte NICHT aufgerufen werden
    expect(mockExtractText).not.toHaveBeenCalled();
  });

  it("importiert Meldungen bei neuer Ausgabe (Happy Path)", async () => {
    mockExistingIssues = []; // Kein Duplikat
    mockInsertedIssue = { id: "new-issue-1" };

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pdfs_found).toBeGreaterThanOrEqual(1);
    expect(body.announcements_imported).toBe(1);
    expect(mockExtractText).toHaveBeenCalled();
    expect(mockBuildPrompt).toHaveBeenCalled();
    expect(mockParseResponse).toHaveBeenCalled();
  });

  it("setzt Issue-Status auf error wenn PDF nicht ladbar", async () => {
    mockExistingIssues = [];
    mockInsertedIssue = { id: "new-issue-1" };

    // PDF-Fetch schlaegt fehl
    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes("bad-saeckingen.de/amtsblatt") &&
        !url.endsWith(".pdf")
      ) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("<html>PDF links</html>"),
        });
      }
      if (url.endsWith(".pdf")) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.announcements_imported).toBe(0);
  });

  it("setzt Issue-Status auf error wenn zu wenig Text extrahiert", async () => {
    mockExistingIssues = [];
    mockInsertedIssue = { id: "new-issue-1" };
    mockExtractText.mockResolvedValueOnce({ text: "Kurz", pages: 1 });

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.announcements_imported).toBe(0);
  });

  it("gibt 502 wenn Amtsblatt-Seite nicht erreichbar", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 503 }),
    );

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );

    expect(res.status).toBe(502);
  });

  it("gibt 500 wenn Quartier Bad Saeckingen nicht gefunden", async () => {
    mockQuarter = null;

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Quartier");
  });

  it("verarbeitet nur das neueste PDF (slice 0,1)", async () => {
    mockExtractPdfUrls.mockReturnValueOnce([
      "https://bad-saeckingen.de/Amtsblatt_2026_06.pdf",
      "https://bad-saeckingen.de/Amtsblatt_2026_05.pdf",
      "https://bad-saeckingen.de/Amtsblatt_2026_04.pdf",
    ]);

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    await GET(makeRequest({ Authorization: "Bearer test-cron-secret-123" }));

    // parseAmtsblattFilename wird fuer alle PDFs aufgerufen (Sortierung),
    // aber extractTextFromPdf nur fuer das neueste
    expect(mockExtractText).toHaveBeenCalledTimes(1);
  });

  it("setzt Issue-Status auf error wenn Claude API fehlschlaegt", async () => {
    mockExistingIssues = [];
    mockInsertedIssue = { id: "new-issue-1" };

    mockFetch.mockImplementation((url: string) => {
      if (
        url.includes("bad-saeckingen.de/amtsblatt") &&
        !url.endsWith(".pdf")
      ) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("<html>PDF</html>"),
        });
      }
      if (url.endsWith(".pdf")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });
      }
      if (url.includes("api.anthropic.com")) {
        return Promise.resolve({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.announcements_imported).toBe(0);
  });

  it("ignoriert PDFs mit unbekanntem Dateiformat", async () => {
    mockParseFilename.mockReturnValueOnce(null);

    const { GET } = await import("@/app/api/cron/amtsblatt-sync/route");
    const res = await GET(
      makeRequest({ Authorization: "Bearer test-cron-secret-123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.announcements_imported).toBe(0);
    expect(mockExtractText).not.toHaveBeenCalled();
  });
});
