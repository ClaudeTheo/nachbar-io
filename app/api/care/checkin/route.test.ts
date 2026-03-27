// app/api/care/checkin/route.test.ts
// Nachbar.io — API-Route-Tests für Check-in-Endpunkt (POST + GET)
// Testet: Auth, Validierung, Verschlüsselung, Auto-SOS, Angehörigen-Benachrichtigung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';
import { encryptField } from '@/lib/care/field-encryption';

// --- Mocks ---

const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/notifications', () => ({
  sendCareNotification: vi.fn().mockResolvedValue({ anyDelivered: true }),
}));

vi.mock('@/lib/care/api-helpers', () => ({
  requireCareAccess: vi.fn().mockResolvedValue('admin'),
}));

vi.mock('@/lib/care/logger', () => ({
  createCareLogger: vi.fn().mockReturnValue({
    requestId: 'test-req-id',
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    done: vi.fn(),
  }),
}));

vi.mock('@/lib/care/consent', () => ({
  checkCareConsent: vi.fn().mockResolvedValue(true),
}));

import { POST, GET } from './route';
import { writeAuditLog } from '@/lib/care/audit';
import { sendCareNotification } from '@/lib/care/notifications';
import { isEncrypted } from '@/lib/care/field-encryption';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/checkin');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, { method: 'GET' });
}

const TEST_USER = { id: 'user-senior-2', email: 'senior2@test.de' };

// --- POST Tests ---

describe('POST /api/care/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.reset();
    mockSupabase.setUser(TEST_USER);
  });

  describe('Authentifizierung', () => {
    it('gibt 401 zurück ohne authentifizierten User', async () => {
      mockSupabase.setUser(null);

      const response = await POST(createPostRequest({ status: 'ok' }));
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toContain('authentifiziert');
    });
  });

  describe('Validierung', () => {
    it('gibt 400 zurück ohne Status', async () => {
      const response = await POST(createPostRequest({}));
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('Status');
    });

    it('gibt 400 zurück bei ungültigem Status', async () => {
      const response = await POST(createPostRequest({ status: 'invalid_status' }));
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('Ungültiger Status');
    });

    it('akzeptiert gültige Status-Werte: ok, not_well, need_help', async () => {
      for (const status of ['ok', 'not_well', 'need_help']) {
        vi.clearAllMocks();
        mockSupabase.reset();
        mockSupabase.setUser(TEST_USER);

        // Insert-Response für neuen Check-in
        mockSupabase.addResponse('care_checkins', {
          data: { id: `ci-${status}`, status, note: null, senior_id: TEST_USER.id },
          error: null,
        });

        // Fuer not_well: Relatives-Query
        if (status === 'not_well') {
          mockSupabase.addResponse('care_helpers', { data: [], error: null });
        }
        // Fuer need_help: SOS-Insert
        if (status === 'need_help') {
          mockSupabase.addResponse('care_sos_alerts', { data: null, error: null });
        }

        const response = await POST(createPostRequest({ status }));
        expect(response.status).toBe(201);
      }
    });

    it('gibt 400 zurück bei ungültigem JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/care/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'NOT JSON',
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Erfolgreicher Check-in', () => {
    it('erstellt neuen Check-in und gibt 201 zurück', async () => {
      const checkinData = {
        id: 'ci-new-1',
        senior_id: TEST_USER.id,
        status: 'ok',
        mood: 'good',
        note: null,
        scheduled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      mockSupabase.addResponse('care_checkins', { data: checkinData, error: null });

      const response = await POST(createPostRequest({ status: 'ok', mood: 'good' }));
      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.id).toBe('ci-new-1');
      expect(body.status).toBe('ok');
    });

    it('verschlüsselt note-Feld (DSGVO Art. 9)', async () => {
      const insertedNotes: unknown[] = [];
      mockSupabase.fromFn.mockImplementation((table: string) => {
        const createChain = (): unknown => new Proxy({}, {
          get(_, prop: string) {
            if (prop === 'then') {
              if (table === 'care_checkins') {
                return (resolve: (v: unknown) => void) => resolve({
                  data: { id: 'ci-enc', status: 'ok', note: null, senior_id: TEST_USER.id },
                  error: null,
                });
              }
              return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
            }
            if (prop === 'insert') {
              return (data: Record<string, unknown>) => {
                if (table === 'care_checkins') insertedNotes.push(data.note);
                return createChain();
              };
            }
            return (..._args: unknown[]) => createChain();
          },
        });
        return createChain();
      });

      await POST(createPostRequest({ status: 'ok', note: 'Fühle mich gut heute' }));

      expect(insertedNotes.length).toBeGreaterThan(0);
      expect(insertedNotes[0]).not.toBe('Fühle mich gut heute');
      expect(isEncrypted(insertedNotes[0] as string)).toBe(true);
    });

    it('schreibt Audit-Log mit korrektem Event-Type', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: { id: 'ci-audit', status: 'ok', note: null, senior_id: TEST_USER.id },
        error: null,
      });

      await POST(createPostRequest({ status: 'ok' }));

      expect(writeAuditLog).toHaveBeenCalledWith(mockSupabase.supabase, expect.objectContaining({
        eventType: 'checkin_ok',
        seniorId: TEST_USER.id,
      }));
    });

    it('schreibt checkin_not_well Event bei not_well Status', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: { id: 'ci-nw', status: 'not_well', note: null, senior_id: TEST_USER.id },
        error: null,
      });
      mockSupabase.addResponse('care_helpers', { data: [], error: null });

      await POST(createPostRequest({ status: 'not_well' }));

      expect(writeAuditLog).toHaveBeenCalledWith(mockSupabase.supabase, expect.objectContaining({
        eventType: 'checkin_not_well',
      }));
    });
  });

  describe('Angehörigen-Benachrichtigung bei not_well', () => {
    it('benachrichtigt Angehörige wenn Status not_well', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: { id: 'ci-notify', status: 'not_well', note: null, senior_id: TEST_USER.id },
        error: null,
      });
      mockSupabase.addResponse('care_helpers', {
        data: [{ user_id: 'relative-1' }, { user_id: 'relative-2' }],
        error: null,
      });

      await POST(createPostRequest({ status: 'not_well' }));

      expect(sendCareNotification).toHaveBeenCalledTimes(2);
      expect(sendCareNotification).toHaveBeenCalledWith(
        mockSupabase.supabase,
        expect.objectContaining({
          userId: 'relative-1',
          type: 'care_checkin_missed',
          channels: ['push', 'in_app'],
        })
      );
    });

    it('benachrichtigt NICHT bei Status ok', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: { id: 'ci-ok', status: 'ok', note: null, senior_id: TEST_USER.id },
        error: null,
      });

      await POST(createPostRequest({ status: 'ok' }));

      expect(sendCareNotification).not.toHaveBeenCalled();
    });
  });

  describe('Auto-SOS bei need_help', () => {
    it('erstellt automatisch SOS-Alert bei need_help', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: { id: 'ci-sos', status: 'need_help', note: null, senior_id: TEST_USER.id },
        error: null,
      });
      mockSupabase.addResponse('care_sos_alerts', { data: null, error: null });

      await POST(createPostRequest({ status: 'need_help' }));

      // Prüfen dass from('care_sos_alerts') aufgerufen wurde (für den Auto-SOS-Insert)
      const sosCalls = mockSupabase.fromCalls.filter(c => c.table === 'care_sos_alerts');
      expect(sosCalls.length).toBeGreaterThan(0);
    });

    it('erstellt KEINEN SOS-Alert bei Status ok', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: { id: 'ci-no-sos', status: 'ok', note: null, senior_id: TEST_USER.id },
        error: null,
      });

      await POST(createPostRequest({ status: 'ok' }));

      const sosCalls = mockSupabase.fromCalls.filter(c => c.table === 'care_sos_alerts');
      expect(sosCalls).toHaveLength(0);
    });
  });

  describe('Fehlerbehandlung', () => {
    it('gibt 500 zurück bei DB-Insert-Fehler', async () => {
      mockSupabase.addResponse('care_checkins', {
        data: null,
        error: { message: 'Insert failed' },
      });

      const response = await POST(createPostRequest({ status: 'ok' }));
      expect(response.status).toBe(500);
    });
  });
});

// --- GET Tests ---

// Echt verschlüsselter Wert für Mock-Daten
const ENCRYPTED_CHECKIN_NOTE = encryptField('Fühle mich nicht gut')!;

describe('GET /api/care/checkin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.reset();
    mockSupabase.setUser(TEST_USER);
  });

  it('gibt 401 zurück ohne authentifizierten User', async () => {
    mockSupabase.setUser(null);

    const response = await GET(createGetRequest());
    expect(response.status).toBe(401);
  });

  it('gibt Check-in-Historie zurück und entschlüsselt Notizen', async () => {
    mockSupabase.addResponse('care_checkins', {
      data: [
        { id: 'ci-1', status: 'ok', note: null },
        { id: 'ci-2', status: 'not_well', note: ENCRYPTED_CHECKIN_NOTE },
      ],
      error: null,
    });

    const response = await GET(createGetRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveLength(2);
    // Verschlüsseltes Feld wurde entschlüsselt
    expect(body[1].note).toBe('Fühle mich nicht gut');
  });

  it('gibt 500 zurück bei DB-Query-Fehler', async () => {
    mockSupabase.addResponse('care_checkins', {
      data: null,
      error: { message: 'Query timeout' },
    });

    const response = await GET(createGetRequest());
    expect(response.status).toBe(500);
  });
});
