// __tests__/api/anonymous-bug-report.test.ts
// Tests fuer den anonymen Bug-Report Endpoint
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock-Funktionen fuer Supabase Admin-Client
const mockFrom = vi.fn();
const mockDelete = vi.fn();
const mockLt = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Hilfsfunktion: NextRequest mit Headers erstellen
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/bug-reports/anonymous', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'TestBrowser/1.0',
      'accept-language': 'de-DE',
    },
    body: JSON.stringify(body),
  });
}

// Standard-Mock-Kette fuer Supabase-Aufrufe einrichten
function setupDefaultMocks(options: {
  rateLimitData?: { report_count: number; window_start: string } | null;
  insertError?: { message: string } | null;
} = {}) {
  const { rateLimitData = null, insertError = null } = options;

  // Zuruecksetzen
  mockFrom.mockReset();
  mockDelete.mockReset();
  mockLt.mockReset();
  mockSelect.mockReset();
  mockEq.mockReset();
  mockSingle.mockReset();
  mockUpdate.mockReset();
  mockInsert.mockReset();

  // Kette: from('bug_report_rate_limits').delete().lt(...)
  mockLt.mockResolvedValue({ error: null });
  mockDelete.mockReturnValue({ lt: mockLt });

  // Kette: from('bug_report_rate_limits').select(...).eq(...).single()
  mockSingle.mockResolvedValue({ data: rateLimitData, error: rateLimitData ? null : { code: 'PGRST116' } });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // Kette: from('bug_report_rate_limits').update(...).eq(...) oder .insert(...)
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockInsert.mockResolvedValue({ error: insertError });

  // from() Router: verschiedene Tabellen → verschiedene Ketten
  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'bug_report_rate_limits') {
      callCount++;
      // 1. Aufruf: delete (Aufraeumen), 2. Aufruf: select (Zaehler pruefen), 3. Aufruf: insert/update
      if (callCount === 1) return { delete: mockDelete };
      if (callCount === 2) return { select: mockSelect };
      if (callCount === 3) {
        return rateLimitData ? { update: mockUpdate } : { insert: mockInsert };
      }
    }
    if (table === 'bug_reports') {
      return { insert: mockInsert };
    }
    return { insert: mockInsert };
  });
}

describe('POST /api/bug-reports/anonymous', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gibt success zurueck wenn Honeypot-Feld ausgefuellt ist (kein DB-Insert)', async () => {
    // Honeypot: body.website ist gesetzt → sofort success, kein Insert
    const req = createMockRequest({ website: 'http://spam.com', page_url: '/test' });

    const { POST } = await import('@/app/api/bug-reports/anonymous/route');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Kein Supabase-Aufruf
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('gibt 429 zurueck wenn Rate-Limit ueberschritten', async () => {
    setupDefaultMocks({
      rateLimitData: {
        report_count: 3,
        window_start: new Date().toISOString(),
      },
    });

    const req = createMockRequest({ page_url: '/test' });

    const { POST } = await import('@/app/api/bug-reports/anonymous/route');
    const res = await POST(req);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Zu viele Bug-Reports');
  });

  it('gibt 400 zurueck wenn page_url fehlt', async () => {
    setupDefaultMocks();

    const req = createMockRequest({ user_comment: 'Etwas ist kaputt' });

    const { POST } = await import('@/app/api/bug-reports/anonymous/route');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('page_url');
  });

  it('speichert anonymen Bug-Report erfolgreich', async () => {
    setupDefaultMocks();

    // Letzter mockFrom-Aufruf (bug_reports) muss insert liefern
    const bugInsert = vi.fn().mockResolvedValue({ error: null });
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bug_report_rate_limits') {
        callCount++;
        if (callCount === 1) return { delete: mockDelete };
        if (callCount === 2) return { select: mockSelect };
        if (callCount === 3) return { insert: mockInsert };
      }
      if (table === 'bug_reports') {
        return { insert: bugInsert };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const req = createMockRequest({
      page_url: '/dashboard',
      page_title: 'Dashboard',
      user_comment: 'Button funktioniert nicht',
      browser_info: { name: 'Chrome', version: '120' },
    });

    const { POST } = await import('@/app/api/bug-reports/anonymous/route');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Pruefen dass bug_reports.insert aufgerufen wurde
    expect(bugInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: null,
        page_url: '/dashboard',
        page_title: 'Dashboard',
        source: 'anonymous',
        status: 'new',
      })
    );
  });

  it('kuerzt user_comment auf 500 Zeichen', async () => {
    setupDefaultMocks();

    const bugInsert = vi.fn().mockResolvedValue({ error: null });
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bug_report_rate_limits') {
        callCount++;
        if (callCount === 1) return { delete: mockDelete };
        if (callCount === 2) return { select: mockSelect };
        if (callCount === 3) return { insert: mockInsert };
      }
      if (table === 'bug_reports') {
        return { insert: bugInsert };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const longComment = 'A'.repeat(1000);
    const req = createMockRequest({
      page_url: '/test',
      user_comment: longComment,
    });

    const { POST } = await import('@/app/api/bug-reports/anonymous/route');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(bugInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_comment: 'A'.repeat(500),
      })
    );
  });

  it('gibt 500 zurueck bei Datenbank-Fehler', async () => {
    setupDefaultMocks();

    const bugInsert = vi.fn().mockResolvedValue({ error: { message: 'DB Fehler' } });
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bug_report_rate_limits') {
        callCount++;
        if (callCount === 1) return { delete: mockDelete };
        if (callCount === 2) return { select: mockSelect };
        if (callCount === 3) return { insert: mockInsert };
      }
      if (table === 'bug_reports') {
        return { insert: bugInsert };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const req = createMockRequest({ page_url: '/test' });

    const { POST } = await import('@/app/api/bug-reports/anonymous/route');
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('nicht gespeichert');
  });
});
