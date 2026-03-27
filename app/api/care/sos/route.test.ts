// app/api/care/sos/route.test.ts
// Nachbar.io — API-Route-Tests für SOS-Endpunkt (POST + GET)
// Testet: Auth, Validierung, Verschlüsselung, Feature-Gate, Benachrichtigungen

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';
import { encryptField, isEncrypted } from '@/lib/care/field-encryption';

// --- Mocks VOR Imports definieren ---

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

vi.mock('@/lib/care/permissions', () => ({
  canAccessFeature: vi.fn().mockResolvedValue(true),
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
import { canAccessFeature } from '@/lib/care/permissions';

// --- Helpers ---

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/sos');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, { method: 'GET' });
}

const TEST_USER = { id: 'user-senior-1', email: 'senior@test.de' };

// Echt verschlüsselter Wert für Mock-Daten (Decryption-safe)
const ENCRYPTED_NOTE = encryptField('Test-Notiz')!;

// --- Tests ---

describe('POST /api/care/sos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.reset();
    mockSupabase.setUser(TEST_USER);
  });

  describe('Authentifizierung', () => {
    it('gibt 401 zurück ohne authentifizierten User', async () => {
      mockSupabase.setUser(null);

      const response = await POST(createPostRequest({ category: 'general_help' }));
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toContain('authentifiziert');
    });
  });

  describe('Validierung', () => {
    it('gibt 400 zurück ohne Kategorie', async () => {
      const response = await POST(createPostRequest({}));
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('Kategorie');
    });

    it('gibt 400 zurück bei ungültiger Kategorie', async () => {
      const response = await POST(createPostRequest({ category: 'invalid_category' }));
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('Ungültige Kategorie');
    });

    it('gibt 400 zurück bei ungültigem JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/care/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'INVALID JSON',
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Feature-Gate', () => {
    it('gibt 403 zurück wenn Feature nicht im Abo-Plan', async () => {
      vi.mocked(canAccessFeature).mockResolvedValueOnce(false);

      const response = await POST(createPostRequest({ category: 'general_help' }));
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toContain('Abo-Plan');
      expect(body.requiredFeature).toBe('sos_all');
    });

    it('prüft medical_emergency_sos Feature für medizinischen Notfall', async () => {
      mockSupabase.addResponse('care_sos_alerts', {
        data: { id: 'alert-1', status: 'triggered', category: 'medical_emergency', notes: null },
        error: null,
      });
      mockSupabase.addResponse('care_helpers', { data: [], error: null });

      await POST(createPostRequest({ category: 'medical_emergency' }));

      expect(canAccessFeature).toHaveBeenCalledWith(
        mockSupabase.supabase,
        TEST_USER.id,
        'medical_emergency_sos'
      );
    });
  });

  describe('Erfolgreicher SOS-Alert', () => {
    it('erstellt SOS-Alert und gibt 201 zurück', async () => {
      mockSupabase.addResponse('care_sos_alerts', {
        data: { id: 'alert-new-1', status: 'triggered', category: 'general_help', notes: null, source: 'app' },
        error: null,
      });
      mockSupabase.addResponse('care_helpers', { data: [], error: null });

      const response = await POST(createPostRequest({ category: 'general_help' }));

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe('alert-new-1');
      expect(body.category).toBe('general_help');
    });

    it('verschlüsselt notes-Feld (DSGVO Art. 9)', async () => {
      // Custom from-Mock der insert-Daten abfaengt
      const insertedData: Record<string, unknown>[] = [];
      mockSupabase.fromFn.mockImplementation((table: string) => {
        const createChain = (): unknown => new Proxy({}, {
          get(_, prop: string) {
            if (prop === 'then') {
              if (table === 'care_sos_alerts') {
                return (resolve: (v: unknown) => void) => resolve({
                  data: { id: 'a-enc', status: 'triggered', notes: null, category: 'general_help' },
                  error: null,
                });
              }
              if (table === 'care_helpers') {
                return (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
              }
              return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
            }
            if (prop === 'insert') {
              return (data: Record<string, unknown>) => {
                insertedData.push(data);
                return createChain();
              };
            }
            return (..._args: unknown[]) => createChain();
          },
        });
        return createChain();
      });

      await POST(createPostRequest({ category: 'general_help', notes: 'Sensible medizinische Info' }));

      expect(insertedData.length).toBeGreaterThan(0);
      const inserted = insertedData[0];
      expect(inserted.notes).not.toBe('Sensible medizinische Info');
      expect(isEncrypted(inserted.notes as string)).toBe(true);
    });

    it('schreibt Audit-Log nach Alert-Erstellung', async () => {
      mockSupabase.addResponse('care_sos_alerts', {
        data: { id: 'alert-audit', status: 'triggered', notes: null, category: 'general_help' },
        error: null,
      });
      mockSupabase.addResponse('care_helpers', { data: [], error: null });

      await POST(createPostRequest({ category: 'general_help' }));

      expect(writeAuditLog).toHaveBeenCalledWith(mockSupabase.supabase, expect.objectContaining({
        seniorId: TEST_USER.id,
        actorId: TEST_USER.id,
        eventType: 'sos_triggered',
        referenceType: 'care_sos_alerts',
        referenceId: 'alert-audit',
      }));
    });

    it('benachrichtigt Level-1-Helfer bei vorhandenen Helfern', async () => {
      mockSupabase.addResponse('care_sos_alerts', {
        data: { id: 'alert-notify', status: 'triggered', notes: null, category: 'general_help' },
        error: null,
      });
      mockSupabase.addResponse('care_helpers', {
        data: [{ user_id: 'helper-1' }, { user_id: 'helper-2' }],
        error: null,
      });
      // Update status to 'notified'
      mockSupabase.addResponse('care_sos_alerts', { data: null, error: null });

      await POST(createPostRequest({ category: 'general_help' }));

      expect(sendCareNotification).toHaveBeenCalledTimes(2);
      expect(sendCareNotification).toHaveBeenCalledWith(
        mockSupabase.supabase,
        expect.objectContaining({
          userId: 'helper-1',
          type: 'care_sos',
        })
      );
    });
  });

  describe('Fehlerbehandlung', () => {
    it('gibt 500 zurück bei DB-Insert-Fehler', async () => {
      mockSupabase.addResponse('care_sos_alerts', {
        data: null,
        error: { message: 'DB connection lost' },
      });

      const response = await POST(createPostRequest({ category: 'general_help' }));
      expect(response.status).toBe(500);
    });
  });
});

describe('GET /api/care/sos', () => {
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

  it('gibt Alerts zurück für authentifizierten User (Admin)', async () => {
    // Admin-Check
    mockSupabase.addResponse('users', { data: { is_admin: true }, error: null });
    // Alerts query — Array mit gültig entschlüsselbaren Daten
    mockSupabase.addResponse('care_sos_alerts', {
      data: [
        { id: 'alert-1', status: 'triggered', notes: null, responses: [] },
        { id: 'alert-2', status: 'notified', notes: ENCRYPTED_NOTE, responses: [] },
      ],
      error: null,
    });

    const response = await GET(createGetRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveLength(2);
    // Verschlüsseltes Feld wurde entschlüsselt
    expect(body[1].notes).toBe('Test-Notiz');
  });

  it('gibt 500 zurück bei DB-Query-Fehler', async () => {
    mockSupabase.addResponse('users', { data: { is_admin: true }, error: null });
    mockSupabase.addResponse('care_sos_alerts', {
      data: null,
      error: { message: 'Query failed' },
    });

    const response = await GET(createGetRequest());
    expect(response.status).toBe(500);
  });
});
