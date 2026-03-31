// app/api/care/profile/route.test.ts
// Nachbar.io — Tests für Care-Profil API-Route (GET + PUT)
// Testet: Auth, Zugriff, Validierung, Verschlüsselung, Consent, Audit

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createRouteMockSupabase } from '@/lib/care/__tests__/mock-supabase';

// --- Mocks ---
const mockSupabase = createRouteMockSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock('@/lib/care/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/care/api-helpers', () => ({
  requireCareAccess: vi.fn().mockResolvedValue('admin'),
}));

vi.mock('@/lib/care/consent', () => ({
  checkCareConsent: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/care/field-encryption', () => ({
  encryptFields: vi.fn((_data: unknown) => _data),
  decryptFields: vi.fn((_data: unknown) => _data),
  encryptEmergencyContacts: vi.fn((_data: unknown) => _data),
  decryptEmergencyContacts: vi.fn((_data: unknown) => _data),
  CARE_PROFILES_ENCRYPTED_FIELDS: ['medical_notes', 'insurance_number'],
}));

import { GET, PUT } from './route';
import { writeAuditLog } from '@/lib/care/audit';
import { requireCareAccess } from '@/lib/care/api-helpers';
import { checkCareConsent } from '@/lib/care/consent';

// --- Helpers ---
function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/care/profile');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function createPutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/care/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockProfile = {
  id: 'profile-1',
  user_id: 'user-1',
  care_level: '3',
  emergency_contacts: [],
  medical_notes: null,
  preferred_hospital: 'St. Blasien',
  checkin_times: ['08:00', '20:00'],
  checkin_enabled: true,
  escalation_config: {
    escalate_to_level_2_after_minutes: 240,
    escalate_to_level_3_after_minutes: 480,
    escalate_to_level_4_after_minutes: 720,
  },
};

describe('GET /api/care/profile', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Nicht authentifiziert');
  });

  it('lädt eigenes Profil', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
    mockSupabase.addResponse('care_profiles', { data: mockProfile, error: null });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.care_level).toBe('3');
    expect(json.checkin_times).toEqual(['08:00', '20:00']);
  });

  it('gibt null bei nicht vorhandenem Profil', async () => {
    mockSupabase.setUser({ id: 'user-neu', email: 'neu@test.de' });
    mockSupabase.addResponse('care_profiles', { data: null, error: null });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toBeNull();
  });

  it('prüft Zugriff bei Fremd-Zugriff via senior_id', async () => {
    mockSupabase.setUser({ id: 'helfer-1', email: 'helfer@test.de' });
    mockSupabase.addResponse('care_profiles', { data: mockProfile, error: null });

    const res = await GET(createGetRequest({ senior_id: 'user-1' }));
    expect(res.status).toBe(200);
    expect(requireCareAccess).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('gibt 403 bei fehlendem Fremd-Zugriff', async () => {
    vi.mocked(requireCareAccess).mockResolvedValueOnce(null);
    mockSupabase.setUser({ id: 'fremder-1', email: 'fremder@test.de' });

    const res = await GET(createGetRequest({ senior_id: 'user-1' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Kein Zugriff');
  });

  it('gibt 500 bei Datenbankfehler', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
    mockSupabase.addResponse('care_profiles', { data: null, error: { message: 'DB-Error' } });

    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/care/profile', () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  it('gibt 401 wenn nicht authentifiziert', async () => {
    const res = await PUT(createPutRequest({ care_level: '2' }));
    expect(res.status).toBe(401);
  });

  it('gibt 403 wenn Consent fehlt', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
    vi.mocked(checkCareConsent).mockResolvedValueOnce(false);

    const res = await PUT(createPutRequest({ care_level: '2' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.feature).toBe('care_profile');
  });

  it('aktualisiert Profil mit gültigem care_level', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
    mockSupabase.addResponse('care_profiles', { data: { ...mockProfile, care_level: '2' }, error: null });

    const res = await PUT(createPutRequest({ care_level: '2' }));
    expect(res.status).toBe(200);
    expect(writeAuditLog).toHaveBeenCalled();
  });

  it('weist ungültige Pflegestufe ab', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });

    const res = await PUT(createPutRequest({ care_level: '9' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültige Pflegestufe');
  });

  it('validiert Check-in-Zeiten Format HH:MM', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });

    const res = await PUT(createPutRequest({ checkin_times: ['25:00'] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültige Uhrzeit');
  });

  it('akzeptiert gültige Check-in-Zeiten', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
    mockSupabase.addResponse('care_profiles', { data: { ...mockProfile, checkin_times: ['08:00', '12:30', '20:00'] }, error: null });

    const res = await PUT(createPutRequest({ checkin_times: ['08:00', '12:30', '20:00'] }));
    expect(res.status).toBe(200);
  });

  it('validiert Notfallkontakte', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });

    const res = await PUT(createPutRequest({
      emergency_contacts: [{ name: '', phone: '123', role: 'unknown', priority: 1, relationship: 'X' }],
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültiger Notfallkontakt');
  });

  it('akzeptiert gültige Notfallkontakte', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });
    mockSupabase.addResponse('care_profiles', { data: mockProfile, error: null });

    const contacts = [
      { name: 'Anna', phone: 'enc:+49176xxx', role: 'relative', priority: 1, relationship: 'Tochter' },
    ];
    const res = await PUT(createPutRequest({ emergency_contacts: contacts }));
    expect(res.status).toBe(200);
  });

  it('validiert Eskalationskonfiguration', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });

    const res = await PUT(createPutRequest({
      escalation_config: { escalate_to_level_2_after_minutes: -1, escalate_to_level_3_after_minutes: 480, escalate_to_level_4_after_minutes: 720 },
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültige Eskalationskonfiguration');
  });

  it('weist ungültiges JSON ab', async () => {
    mockSupabase.setUser({ id: 'user-1', email: 'test@test.de' });

    const req = new NextRequest('http://localhost:3000/api/care/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'kein-json',
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Ungültiges Anfrage-Format');
  });
});
