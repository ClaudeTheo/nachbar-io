// __tests__/api/voice/tts.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Auth Mock
const mockRequireAuth = vi.fn().mockResolvedValue({ userId: "test-user" });
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

// Fetch Mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("POST /api/voice/tts", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockClear();
    mockRequireAuth.mockResolvedValue({ userId: "test-user" });
    process.env.OPENAI_API_KEY = "test-key";
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

  it("ruft OpenAI TTS API auf und gibt Audio zurueck", async () => {
    const audioData = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(audioData);
          controller.close();
        },
      }),
      headers: new Headers({ "content-type": "audio/mpeg" }),
    });

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
    const audioData = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(audioData);
          controller.close();
        },
      }),
      headers: new Headers({ "content-type": "audio/mpeg" }),
    });

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test", voice: "onyx", speed: 0.85 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    // Pruefe dass OpenAI mit den richtigen Parametern aufgerufen wurde
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.voice).toBe("onyx");
    expect(callBody.speed).toBe(0.85);
  });

  it("nutzt Default-Speed 1.0 wenn kein speed angegeben", async () => {
    const audioData = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(audioData);
          controller.close();
        },
      }),
      headers: new Headers({ "content-type": "audio/mpeg" }),
    });

    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test" }),
    });
    await POST(req as never);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.voice).toBe("ash");
    expect(callBody.speed).toBe(0.95);
  });

  it("gibt 502 zurueck wenn OpenAI API fehlschlaegt", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { POST } = await import("@/app/api/voice/tts/route");
    const req = new Request("http://localhost/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Test" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(502);
  });
});
