// __tests__/api/voice/assistant.test.ts
// Tests fuer den Sprach-Assistenten API-Endpunkt
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mocks
const mockRequireAuth = vi.fn();
const mockClassifyAssistantAction = vi.fn();

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  unauthorizedResponse: () =>
    NextResponse.json({ error: 'Nicht authentifiziert', code: 'UNAUTHORIZED' }, { status: 401 }),
  errorResponse: (message: string, status: number) => {
    console.error(`[care/api] ${status}: ${message}`);
    return NextResponse.json({ error: message }, { status });
  },
}));

vi.mock('@/lib/voice/assistant-classify', () => ({
  classifyAssistantAction: (...args: unknown[]) => mockClassifyAssistantAction(...args),
}));

describe('POST /api/voice/assistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt 401 zurueck wenn nicht authentifiziert', async () => {
    mockRequireAuth.mockResolvedValue(null);

    const { POST } = await import('@/app/api/voice/assistant/route');
    const req = new NextRequest('http://localhost/api/voice/assistant', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hallo' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('gibt 400 zurueck bei leerem Text', async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: {},
      user: { id: 'u1' },
    });

    const { POST } = await import('@/app/api/voice/assistant/route');
    const req = new NextRequest('http://localhost/api/voice/assistant', {
      method: 'POST',
      body: JSON.stringify({ text: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('gibt 400 zurueck bei zu langem Text (>2000 Zeichen)', async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: {},
      user: { id: 'u1' },
    });

    const longText = 'x'.repeat(2001);
    const { POST } = await import('@/app/api/voice/assistant/route');
    const req = new NextRequest('http://localhost/api/voice/assistant', {
      method: 'POST',
      body: JSON.stringify({ text: longText }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('gibt 400 zurueck bei ungueltigem JSON Body', async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: {},
      user: { id: 'u1' },
    });

    const { POST } = await import('@/app/api/voice/assistant/route');
    const req = new NextRequest('http://localhost/api/voice/assistant', {
      method: 'POST',
      body: 'kein-json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('akzeptiert previousAction Parameter und gibt ihn weiter', async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: {},
      user: { id: 'u1' },
    });

    const mockResult = {
      action: 'help_request',
      params: { category: 'einkaufen' },
      message: 'Einkaufshilfe erstellt',
    };
    mockClassifyAssistantAction.mockResolvedValue(mockResult);

    const { POST } = await import('@/app/api/voice/assistant/route');
    const req = new NextRequest('http://localhost/api/voice/assistant', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Nein, Einkaufen',
        previousAction: { action: 'help_request', transcript: 'Fahrt zum Arzt' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // classifyAssistantAction wurde mit previousAction aufgerufen
    expect(mockClassifyAssistantAction).toHaveBeenCalledWith(
      'Nein, Einkaufen',
      { action: 'help_request', transcript: 'Fahrt zum Arzt' }
    );
  });

  it('klassifiziert Text erfolgreich', async () => {
    mockRequireAuth.mockResolvedValue({
      supabase: {},
      user: { id: 'u1' },
    });

    const mockResult = {
      action: 'help_request',
      params: { category: 'einkaufen', title: 'Einkaufshilfe' },
      message: 'Ich brauche Hilfe beim Einkaufen',
    };
    mockClassifyAssistantAction.mockResolvedValue(mockResult);

    const { POST } = await import('@/app/api/voice/assistant/route');
    const req = new NextRequest('http://localhost/api/voice/assistant', {
      method: 'POST',
      body: JSON.stringify({ text: 'Ich brauche Hilfe beim Einkaufen' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.action).toBe('help_request');
    expect(data.params.category).toBe('einkaufen');
    expect(data.message).toBe('Ich brauche Hilfe beim Einkaufen');
  });
});
