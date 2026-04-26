import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Auth-Mock
const mockRequireAuth = vi.fn();
vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  errorResponse: (msg: string, status: number) => new Response(JSON.stringify({ error: msg }), { status }),
}));

const mockCanUsePersonalAi = vi.fn().mockResolvedValue(true);
vi.mock('@/lib/ai/user-settings', () => ({
  AI_HELP_DISABLED_MESSAGE: 'KI-Hilfe ist ausgeschaltet.',
  canUsePersonalAi: (...args: unknown[]) => mockCanUsePersonalAi(...args),
}));

// Originales fetch sichern
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockCanUsePersonalAi.mockResolvedValue(true);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.OPENAI_API_KEY;
});

/** Erstellt NextRequest mit gemockter formData()-Methode */
function createMockRequest(audioFile?: File | Blob | null): NextRequest {
  const req = new NextRequest('http://localhost/api/voice/transcribe', {
    method: 'POST',
  });

  // formData() mocken um den multipart-Parsing-Bug in Vitest zu umgehen
  const mockFormData = new FormData();
  if (audioFile) {
    mockFormData.append('audio', audioFile, 'audio.webm');
  }
  vi.spyOn(req, 'formData').mockResolvedValue(mockFormData);

  return req;
}

describe('POST /api/voice/transcribe', () => {
  it('gibt 401 zurueck wenn nicht authentifiziert', async () => {
    mockRequireAuth.mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/voice/transcribe/route');
    const req = createMockRequest(new Blob(['audio'], { type: 'audio/webm' }));

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('gibt 400 zurueck bei fehlendem Audio', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: {} });
    process.env.OPENAI_API_KEY = 'test-key';

    const { POST } = await import('@/app/api/voice/transcribe/route');
    const req = createMockRequest(); // Kein Audio

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('gibt 503 zurueck wenn OPENAI_API_KEY fehlt', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: {} });
    delete process.env.OPENAI_API_KEY;

    const { POST } = await import('@/app/api/voice/transcribe/route');
    const req = createMockRequest(new Blob(['audio'], { type: 'audio/webm' }));

    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('gibt 503 ai_disabled zurueck wenn KI-Hilfe ausgeschaltet ist und liest kein Audio', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: {} });
    mockCanUsePersonalAi.mockResolvedValueOnce(false);
    const req = createMockRequest(new Blob(['audio'], { type: 'audio/webm' }));

    const { POST } = await import('@/app/api/voice/transcribe/route');
    const res = await POST(req);
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.error).toMatch(/KI-Hilfe ist ausgeschaltet/i);
    expect(req.formData).not.toHaveBeenCalled();
  });

  it('transkribiert Audio erfolgreich via Whisper', async () => {
    mockRequireAuth.mockResolvedValueOnce({ user: { id: 'user-1' }, supabase: {} });
    process.env.OPENAI_API_KEY = 'test-whisper-key';

    // Fetch-Mock: OpenAI-Aufrufe abfangen
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('openai.com')) {
        return new Response(JSON.stringify({ text: 'Hilfe beim Einkaufen' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as typeof fetch;
    globalThis.fetch = fetchMock;

    const { POST } = await import('@/app/api/voice/transcribe/route');
    const req = createMockRequest(new Blob(['fake-audio-data'], { type: 'audio/webm' }));

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.text).toBe('Hilfe beim Einkaufen');

    // Pruefen dass OpenAI aufgerufen wurde
    const calls = (fetchMock as ReturnType<typeof vi.fn>).mock.calls;
    const whisperCall = calls.find((c) => {
      const u = typeof c[0] === 'string' ? c[0] : '';
      return u.includes('openai.com');
    });
    expect(whisperCall).toBeDefined();

    // Authorization-Header pruefen
    if (whisperCall) {
      const reqInit = whisperCall[1] as RequestInit;
      const headers = reqInit.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer test-whisper-key');
    }
  });
});
