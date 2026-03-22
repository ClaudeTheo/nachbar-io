// __tests__/api/cron/main-crons.test.ts
// Main-Cron-Jobs: Auth-Validierung

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Env-Vars setzen
vi.stubEnv('CRON_SECRET', 'test-cron-secret-123');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

// Chainable Supabase-Mock
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
      chain.not = vi.fn().mockReturnValue(chain);
      chain.contains = vi.fn().mockReturnValue(chain);
      chain.order = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.upsert = vi.fn().mockReturnValue(chain);
      chain.delete = vi.fn().mockReturnValue(chain);
      chain.then = (resolve: (v: { data: unknown[]; error: null; count: number }) => void) =>
        resolve({ data: [], error: null, count: 0 });
      return chain;
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(makeSupabaseChain()),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => makeSupabaseChain()),
}));

// Diverse Dependencies die einzelne Crons importieren
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
}));
vi.mock('@/lib/care/logger', () => ({
  createCareLogger: vi.fn(() => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), done: vi.fn(),
  })),
}));
vi.mock('@/lib/care/constants', () => ({
  MEDICATION_DEFAULTS: { snoozeMinutes: 30, missedThresholdMinutes: 60 },
  HEARTBEAT_RETENTION_DAYS: 90,
  CURRENT_CONSENT_VERSION: 'v1',
}));
vi.mock('@/lib/quarters/helpers', () => ({
  getUserQuarterId: vi.fn().mockResolvedValue('q-bs'),
  getQuarterById: vi.fn().mockResolvedValue({ id: 'q-bs', name: 'Bad Saeckingen' }),
}));

// Spezial-Mocks fuer einzelne Crons
vi.mock('@/lib/analytics/snapshot', () => ({
  calculateQuarterSnapshot: vi.fn().mockResolvedValue({}),
  saveSnapshot: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/digest/generator', () => ({
  generateDigest: vi.fn().mockResolvedValue('Zusammenfassung'),
}));
vi.mock('@/lib/events/reminders', () => ({
  processEventReminders: vi.fn().mockResolvedValue({ sent: 0 }),
}));
vi.mock('@/lib/events/recurring', () => ({
  processRecurringEvents: vi.fn().mockResolvedValue({ created: 0 }),
}));
vi.mock('@/lib/waste/sync', () => ({
  runWasteSync: vi.fn().mockResolvedValue({ synced: 0 }),
}));
vi.mock('@/lib/welcome/pack', () => ({
  findNewUsersForWelcomePack: vi.fn().mockResolvedValue([]),
  sendWelcomePack: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/onboarding/sequence', () => ({
  processOnboardingSequence: vi.fn().mockResolvedValue({ processed: 0 }),
}));

const cronRoutes = [
  { name: 'analytics', path: '@/app/api/cron/analytics/route' },
  // digest: braucht Anthropic SDK Mock (Browser-Env Konflikt)
  { name: 'dormancy', path: '@/app/api/cron/dormancy/route' },
  { name: 'event-reminders', path: '@/app/api/cron/event-reminders/route' },
  { name: 'expire-invitations', path: '@/app/api/cron/expire-invitations/route' },
  { name: 'heartbeat-cleanup', path: '@/app/api/cron/heartbeat-cleanup/route' },
  { name: 'onboarding', path: '@/app/api/cron/onboarding/route' },
  { name: 'recurring-events', path: '@/app/api/cron/recurring-events/route' },
  { name: 'subscription-check', path: '@/app/api/cron/subscription-check/route' },
  { name: 'waste-reminder', path: '@/app/api/cron/waste-reminder/route' },
  // waste-sync: braucht or()-Chain Mock
  // amtsblatt-sync: braucht PDF-Fetch + Anthropic Mock
  { name: 'welcome', path: '@/app/api/cron/welcome/route' },
];

describe.each(cronRoutes)('Main-Cron: $name', ({ name, path }) => {
  beforeEach(() => vi.clearAllMocks());

  it(`${name}: gibt 401 ohne Authorization-Header zurueck`, async () => {
    const mod = await import(path);
    const handler = mod.GET;
    const req = new NextRequest(`http://localhost/api/cron/${name}`);
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it(`${name}: gibt 401 mit falschem Secret zurueck`, async () => {
    const mod = await import(path);
    const handler = mod.GET;
    const req = new NextRequest(`http://localhost/api/cron/${name}`, {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it(`${name}: gibt 200 mit korrektem Secret zurueck`, async () => {
    const mod = await import(path);
    const handler = mod.GET;
    const req = new NextRequest(`http://localhost/api/cron/${name}`, {
      headers: { Authorization: 'Bearer test-cron-secret-123' },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });
});
