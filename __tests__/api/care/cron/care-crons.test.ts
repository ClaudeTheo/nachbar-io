// __tests__/api/care/cron/care-crons.test.ts
// Care-Cron-Jobs: Auth-Validierung und Basis-Funktionalitaet

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// CRON_SECRET und Supabase-Env setzen (shopping + tasks nutzen @supabase/supabase-js direkt)
vi.stubEnv('CRON_SECRET', 'test-cron-secret-123');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Chainable Supabase-Mock Fabrik
function makeSupabaseChain() {
  return {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.gte = vi.fn().mockReturnValue(chain);
      chain.lte = vi.fn().mockReturnValue(chain);
      chain.lt = vi.fn().mockReturnValue(chain);
      chain.gt = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.contains = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.delete = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: (v: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null });
      return chain;
    }),
  };
}

// Mock fuer @supabase/supabase-js (shopping + tasks Crons nutzen das direkt)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => makeSupabaseChain()),
}));

// Mock fuer @/lib/supabase/server (alle anderen Crons)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(makeSupabaseChain()),
}));

vi.mock('@/lib/care/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/care/notifications', () => ({ sendCareNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/care/field-encryption', () => ({
  encryptField: vi.fn((v: string) => v),
  decryptField: vi.fn((v: string) => v),
  decryptFields: vi.fn((obj: Record<string, unknown>) => obj),
  decryptFieldsArray: vi.fn((arr: Record<string, unknown>[]) => arr),
  CARE_SOS_ALERTS_ENCRYPTED_FIELDS: ['notes'],
  CARE_MEDICATIONS_ENCRYPTED_FIELDS: ['name', 'dosage', 'instructions'],
  CARE_APPOINTMENTS_ENCRYPTED_FIELDS: ['notes', 'location'],
  CARE_SOS_RESPONSES_ENCRYPTED_FIELDS: ['note'],
}));
vi.mock('@/lib/care/logger', () => ({
  createCareLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
  })),
}));
vi.mock('@/lib/care/constants', () => ({
  MEDICATION_DEFAULTS: { snoozeMinutes: 30, missedThresholdMinutes: 60 },
  HEARTBEAT_RETENTION_DAYS: 90,
  ESCALATION_LEVELS: [
    { level: 1, delayMinutes: 0 },
    { level: 2, delayMinutes: 15 },
    { level: 3, delayMinutes: 30 },
    { level: 4, delayMinutes: 60 },
  ],
  CURRENT_CONSENT_VERSION: 'v1',
}));

// Cron-Routes und ihre Pfade
const cronRoutes = [
  { name: 'appointments', path: '@/app/api/care/cron/appointments/route' },
  { name: 'checkin', path: '@/app/api/care/cron/checkin/route' },
  { name: 'escalation', path: '@/app/api/care/cron/escalation/route' },
  { name: 'heartbeat-escalation', path: '@/app/api/care/cron/heartbeat-escalation/route' },
  { name: 'medications', path: '@/app/api/care/cron/medications/route' },
  { name: 'shopping', path: '@/app/api/care/cron/shopping/route' },
  { name: 'tasks', path: '@/app/api/care/cron/tasks/route' },
];

describe.each(cronRoutes)('Care-Cron: $name', ({ name, path }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`${name}: gibt 401 ohne Authorization-Header zurueck`, async () => {
    const mod = await import(path);
    const handler = mod.GET;
    const req = new NextRequest(`http://localhost/api/care/cron/${name}`);
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it(`${name}: gibt 401 mit falschem Secret zurueck`, async () => {
    const mod = await import(path);
    const handler = mod.GET;
    const req = new NextRequest(`http://localhost/api/care/cron/${name}`, {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it(`${name}: gibt 200 mit korrektem Secret zurueck`, async () => {
    const mod = await import(path);
    const handler = mod.GET;
    const req = new NextRequest(`http://localhost/api/care/cron/${name}`, {
      headers: { Authorization: 'Bearer test-cron-secret-123' },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });
});
