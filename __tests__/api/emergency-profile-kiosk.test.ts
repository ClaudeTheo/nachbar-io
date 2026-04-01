// __tests__/api/emergency-profile-kiosk.test.ts
// Tests fuer Kiosk-Notfallprofil-Endpoint (Level-1 Only, Device-Auth)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Einzelner maybeSingle-Mock pro Aufruf — wird per mockResolvedValueOnce gesteuert
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();

// Chainable Builder: select().eq().eq().maybeSingle() und select().eq().maybeSingle()
function chainable() {
  const obj: Record<string, unknown> = {};
  obj.select = vi.fn().mockReturnValue(obj);
  obj.eq = vi.fn().mockReturnValue(obj);
  obj.maybeSingle = mockMaybeSingle;
  obj.insert = mockInsert;
  return obj;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => chainable()),
  })),
}));

// Crypto-Mock: decrypt gibt den Klartext zurueck
vi.mock('@/modules/care/services/crypto', () => ({
  decrypt: vi.fn((text: string) => text),
}));

const MOCK_LEVEL1 = JSON.stringify({
  fullName: 'Hans Müller',
  dateOfBirth: '15.03.1942',
  bloodType: 'A+',
  allergies: 'Penicillin',
  medications: 'Marcumar, Metformin, Ramipril',
  implants: 'Herzschrittmacher',
  emergencyContact1: { name: 'Anna Müller', phone: '0170-1234567' },
  emergencyContact2: { name: 'Dr. Weber', phone: '07761-5678' },
});

describe('GET /api/care/emergency-profile/kiosk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.KIOSK_DEVICE_TOKEN = 'valid-device-token';
  });

  it('gibt 401 ohne x-device-token Header', async () => {
    const { GET } = await import(
      '@/app/api/care/emergency-profile/kiosk/route'
    );
    const request = new Request(
      'http://localhost/api/care/emergency-profile/kiosk?deviceId=device-1',
      { method: 'GET' }
    );

    const response = await GET(
      request as unknown as import('next/server').NextRequest
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Token');
  });

  it('gibt 400 ohne deviceId Parameter', async () => {
    const { GET } = await import(
      '@/app/api/care/emergency-profile/kiosk/route'
    );
    const request = new Request(
      'http://localhost/api/care/emergency-profile/kiosk',
      {
        method: 'GET',
        headers: { 'x-device-token': 'valid-device-token' },
      }
    );

    const response = await GET(
      request as unknown as import('next/server').NextRequest
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('deviceId');
  });

  it('gibt 403 bei ungueltigem Device-Token', async () => {
    process.env.KIOSK_DEVICE_TOKEN = 'correct-token';

    const { GET } = await import(
      '@/app/api/care/emergency-profile/kiosk/route'
    );

    // kiosk_devices: kein Geraet gefunden, und ENV-Token stimmt nicht
    mockMaybeSingle.mockResolvedValueOnce({ data: null });

    const request = new Request(
      'http://localhost/api/care/emergency-profile/kiosk?deviceId=device-1',
      {
        method: 'GET',
        headers: { 'x-device-token': 'wrong-token' },
      }
    );

    const response = await GET(
      request as unknown as import('next/server').NextRequest
    );
    expect(response.status).toBe(403);
  });

  it('gibt Level-1 Notfalldaten bei gueltigem Token (ENV-Fallback)', async () => {
    process.env.KIOSK_DEVICE_TOKEN = 'valid-device-token';

    const { GET } = await import(
      '@/app/api/care/emergency-profile/kiosk/route'
    );

    // Aufruf 1: kiosk_devices → nicht gefunden (Fallback auf ENV-Token)
    // Aufruf 2: emergency_profiles → Profil mit verschluesseltem Level-1
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({
        data: {
          id: 'profile-1',
          user_id: 'resident-1',
          level1_encrypted: MOCK_LEVEL1,
          level2_encrypted: 'encrypted-level2-data',
          level3_encrypted: 'encrypted-level3-data',
        },
      });

    mockInsert.mockResolvedValue({ error: null });

    const request = new Request(
      'http://localhost/api/care/emergency-profile/kiosk?deviceId=device-pilot-001&userId=resident-1',
      {
        method: 'GET',
        headers: { 'x-device-token': 'valid-device-token' },
      }
    );

    const response = await GET(
      request as unknown as import('next/server').NextRequest
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.fullName).toBe('Hans Müller');
    expect(body.dateOfBirth).toBe('15.03.1942');
    expect(body.bloodType).toBe('A+');
    expect(body.allergies).toBe('Penicillin');
    expect(body.medications).toBe('Marcumar, Metformin, Ramipril');
    expect(body.implants).toBe('Herzschrittmacher');
    expect(body.emergencyContact1).toEqual({
      name: 'Anna Müller',
      phone: '0170-1234567',
    });
    expect(body.emergencyContact2).toEqual({
      name: 'Dr. Weber',
      phone: '07761-5678',
    });
    expect(body.cachedAt).toBeDefined();
    // Level 2/3 duerfen NICHT enthalten sein
    expect(body.level2).toBeUndefined();
    expect(body.level3).toBeUndefined();
  });

  it('gibt empty: true wenn kein Notfallprofil existiert', async () => {
    process.env.KIOSK_DEVICE_TOKEN = 'valid-device-token';

    const { GET } = await import(
      '@/app/api/care/emergency-profile/kiosk/route'
    );

    // Aufruf 1: kiosk_devices → nicht gefunden
    // Aufruf 2: emergency_profiles → nicht vorhanden
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });

    mockInsert.mockResolvedValue({ error: null });

    const request = new Request(
      'http://localhost/api/care/emergency-profile/kiosk?deviceId=device-pilot-001&userId=resident-1',
      {
        method: 'GET',
        headers: { 'x-device-token': 'valid-device-token' },
      }
    );

    const response = await GET(
      request as unknown as import('next/server').NextRequest
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.empty).toBe(true);
    expect(body.cachedAt).toBeDefined();
  });
});
