// __tests__/api/voice/tts.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Auth Mock
const mockRequireAuth = vi.fn().mockResolvedValue({
  user: { id: "test-user" },
  supabase: {},
});
vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  unauthorizedResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    ),
  errorResponse: vi
    .fn()
    .mockImplementation(
      (msg: string, status: number) =>
        new Response(JSON.stringify({ error: msg }), { status }),
    ),
}));

const mockCanUsePersonalAi = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/ai/user-settings", () => ({
  AI_HELP_DISABLED_MESSAGE: "KI-Hilfe ist ausgeschaltet.",
  canUsePersonalAi: (...args: unknown[]) => mockCanUsePersonalAi(...args),
}));

// Supabase Admin Mock (fuer Cache-Upload)
const mockStorageUpload = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    storage: {
      from: () => ({ upload: mockStorageUpload }),
    },
  }),
}));

// Fetch Mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

const SUPA_URL = "https://test.supabase.co";

/**
 * Mock-Helfer: Cache-Hit (HEAD auf tts-cache ok, GET liefert Audio).
 */
function mockCacheHit(audio: Uint8Array = new Uint8Array([0xff, 0xfb])) {
  mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method === "HEAD" && url.includes("/tts-cache/")) {
      return Promise.resolve({ ok: true, status: 200 });
    }
    if (url.includes("/tts-cache/")) {
      return Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(c) {
            c.enqueue(audio);
            c.close();
          },
        }),
        headers: new Headers({ "content-type": "audio/mpeg" }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

/**
 * Mock-Helfer: Cache-Miss (HEAD 404, OpenAI liefert Audio).
 */
function mockCacheMiss(audio: Uint8Array = new Uint8Array([0xff, 0xfb])) {
  mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (opts?.method === "HEAD" && url.includes("/tts-cache/")) {
      return Promise.resolve({ ok: false, status: 404 });
    }
    if (url.includes("api.openai.com")) {
      return Promise.resolve({
        ok: true,
        body: new ReadableStream({
          start(c) {
            c.enqueue(audio);
            c.close();
          },
        }),
        headers: new Headers({ "content-type": "audio/mpeg" }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

describe("POST /api/voice/tts", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();
    mockStorageUpload.mockReset();
    mockStorageUpload.mockResolvedValue({ data: { path: "ok" }, error: null });
    mockRequireAuth.mockResolvedValue({
      user: { id: "test-user" },
      supabase: {},
    });
    mockCanUsePersonalAi.mockReset();
    mockCanUsePersonalAi.mockResolvedValue(true);
    process.env.OPENAI_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("gibt 401 zurueck wenn nicht authentifiziert", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hallo" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("gibt 503 zurueck wenn kein OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hallo" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(503);
  });

  it("gibt 503 ai_disabled zurueck wenn KI-Hilfe ausgeschaltet ist und ruft kein TTS auf", async () => {
    mockCanUsePersonalAi.mockResolvedValueOnce(false);

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hallo" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toMatch(/KI-Hilfe ist ausgeschaltet/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("gibt 400 zurueck bei leerem Text", async () => {
    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("gibt 400 zurueck bei Text ueber 1000 Zeichen", async () => {
    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "A".repeat(1001) }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("ruft OpenAI TTS API auf und gibt Audio zurueck (Cache-Miss)", async () => {
    mockCacheMiss(new Uint8Array([0xff, 0xfb, 0x90, 0x00]));

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Ich oeffne den Muellkalender fuer Sie." }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("sendet voice und speed an OpenAI API", async () => {
    mockCacheMiss();

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test", voice: "onyx", speed: 0.85 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const openaiCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("api.openai.com"),
    );
    expect(openaiCall).toBeDefined();
    const callBody = JSON.parse(openaiCall![1].body);
    expect(callBody.voice).toBe("onyx");
    expect(callBody.speed).toBe(0.85);
  });

  it("nutzt Default-Voice 'ash' und Default-Speed 0.95", async () => {
    mockCacheMiss();

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test" }),
    });
    await POST(req as never);

    const openaiCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("api.openai.com"),
    );
    const callBody = JSON.parse(openaiCall![1].body);
    expect(callBody.voice).toBe("ash");
    expect(callBody.speed).toBe(0.95);
  });

  it("gibt 502 zurueck wenn OpenAI API fehlschlaegt", async () => {
    mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === "HEAD") {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (url.includes("api.openai.com")) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(502);
  });

  // ── Layer-1 Phrase-Cache ───────────────────────────────────────────────

  it("Cache-Hit: liefert Audio aus Supabase-Storage OHNE OpenAI-Call", async () => {
    mockCacheHit();

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Guten Morgen" }),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");

    const openaiCalls = mockFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("api.openai.com"),
    );
    expect(openaiCalls).toHaveLength(0);
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("Cache-Miss: ruft OpenAI auf und triggert Upload in tts-cache", async () => {
    mockCacheMiss();

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Guten Morgen" }),
    });
    const res = await POST(req as never);
    // Body lesen, damit der tee-Stream im Hintergrund durchlaeuft
    await res.arrayBuffer();

    expect(res.status).toBe(200);
    // Upload muss getriggert sein (asynchron). Warten.
    await new Promise((r) => setTimeout(r, 30));
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    const [uploadPath, uploadBody] = mockStorageUpload.mock.calls[0];
    expect(uploadPath).toMatch(/^[a-f0-9]{64}\.mp3$/);
    expect(uploadBody).toBeInstanceOf(ArrayBuffer);
  });

  it("Cache-Miss: Upload-Fehler killt die Response NICHT", async () => {
    mockCacheMiss();
    mockStorageUpload.mockRejectedValueOnce(new Error("upload boom"));

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Guten Morgen" }),
    });
    const res = await POST(req as never);
    const buf = await res.arrayBuffer();

    expect(res.status).toBe(200);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("Cache-Key: deterministisch fuer gleiche Inputs", async () => {
    const { computeCacheKey } =
      await import("@/modules/voice/services/tts.service");
    const input = {
      text: "Guten Morgen",
      voice: "ash",
      speed: 0.95,
      instructionsVersion: "v1",
    };
    const a = await computeCacheKey(input);
    const b = await computeCacheKey(input);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("Cache-Key: unterschiedlich bei anderer speed", async () => {
    const { computeCacheKey } =
      await import("@/modules/voice/services/tts.service");
    const base = {
      text: "Guten Morgen",
      voice: "ash",
      speed: 0.95,
      instructionsVersion: "v1",
    };
    const a = await computeCacheKey(base);
    const b = await computeCacheKey({ ...base, speed: 1.0 });
    const c = await computeCacheKey({ ...base, text: "Guten Abend" });
    const d = await computeCacheKey({ ...base, instructionsVersion: "v2" });
    expect(b).not.toBe(a);
    expect(c).not.toBe(a);
    expect(d).not.toBe(a);
  });
});
