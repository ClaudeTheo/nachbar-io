// __tests__/lib/care/api-helpers-gate.test.ts
// Tests fuer server-seitige Feature-Gate Hilfsfunktionen

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  featureGateResponse,
  requireSubscription,
  requireOrgAccess,
  requireDoctorAccess,
  unauthorizedResponse,
} from '@/lib/care/api-helpers';

// Chainable Supabase-Mock
function createMockSupabase(returnData: unknown, returnError: unknown = null) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  chain.single = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  return chain;
}

// Hilfsfunktion: JSON-Body aus NextResponse extrahieren
async function getResponseBody(response: NextResponse): Promise<Record<string, unknown>> {
  return response.json();
}

// Prueft ob Ergebnis eine NextResponse ist (Fehler) oder ein Datenobjekt (Erfolg)
function isNextResponse(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

describe('featureGateResponse', () => {
  it('PLAN_REQUIRED enthaelt upgradeUrl', async () => {
    const response = featureGateResponse('PLAN_REQUIRED');
    expect(response.status).toBe(403);
    const body = await getResponseBody(response);
    expect(body.code).toBe('PLAN_REQUIRED');
    expect(body.error).toBe('Feature nicht verfügbar');
    expect(body.upgradeUrl).toBe('/care/subscription');
  });

  it('ROLE_REQUIRED enthaelt details', async () => {
    const response = featureGateResponse('ROLE_REQUIRED', { requiredRole: 'admin' });
    expect(response.status).toBe(403);
    const body = await getResponseBody(response);
    expect(body.code).toBe('ROLE_REQUIRED');
    expect(body.error).toBe('Unzureichende Berechtigung');
    expect(body.requiredRole).toBe('admin');
    expect(body.upgradeUrl).toBeUndefined();
  });

  it('TENANT_ACCESS_REQUIRED funktioniert', async () => {
    const response = featureGateResponse('TENANT_ACCESS_REQUIRED');
    expect(response.status).toBe(403);
    const body = await getResponseBody(response);
    expect(body.code).toBe('TENANT_ACCESS_REQUIRED');
    expect(body.error).toBe('Kein Zugriff auf diese Organisation');
    expect(body.upgradeUrl).toBeUndefined();
  });
});

describe('requireSubscription', () => {
  const originalEnv = process.env.PILOT_MODE;

  afterEach(() => {
    process.env.PILOT_MODE = originalEnv;
  });

  it('aktiver Plan mit ausreichendem Level gibt Objekt zurueck', async () => {
    const supabase = createMockSupabase({ plan: 'plus', status: 'active' });
    const result = await requireSubscription(supabase as never, 'user-1', 'free');
    expect(isNextResponse(result)).toBe(false);
    if (!isNextResponse(result)) {
      expect(result.plan).toBe('plus');
      expect(result.status).toBe('active');
    }
  });

  it('Trial-Status wird als aktiv behandelt', async () => {
    const supabase = createMockSupabase({ plan: 'pro', status: 'trial' });
    const result = await requireSubscription(supabase as never, 'user-1', 'pro');
    expect(isNextResponse(result)).toBe(false);
    if (!isNextResponse(result)) {
      expect(result.plan).toBe('pro');
      expect(result.status).toBe('trial');
    }
  });

  it('unzureichender Plan gibt 403 zurueck', async () => {
    const supabase = createMockSupabase({ plan: 'free', status: 'active' });
    const result = await requireSubscription(supabase as never, 'user-1', 'plus');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      expect(result.status).toBe(403);
      const body = await getResponseBody(result);
      expect(body.reason).toBe('plan_insufficient');
    }
  });

  it('abgelaufenes Abo gibt 403 mit reason=subscription_inactive zurueck', async () => {
    const supabase = createMockSupabase({ plan: 'pro', status: 'expired' });
    const result = await requireSubscription(supabase as never, 'user-1', 'free');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      expect(result.status).toBe(403);
      const body = await getResponseBody(result);
      expect(body.reason).toBe('subscription_inactive');
    }
  });

  it('gekuendigtes Abo gibt 403 zurueck', async () => {
    const supabase = createMockSupabase({ plan: 'plus', status: 'cancelled' });
    const result = await requireSubscription(supabase as never, 'user-1', 'free');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      const body = await getResponseBody(result);
      expect(body.reason).toBe('subscription_inactive');
    }
  });

  it('PILOT_MODE Fallback gibt pro/active zurueck', async () => {
    process.env.PILOT_MODE = 'true';
    const supabase = createMockSupabase(null);
    const result = await requireSubscription(supabase as never, 'user-1', 'pro');
    expect(isNextResponse(result)).toBe(false);
    if (!isNextResponse(result)) {
      expect(result.plan).toBe('pro');
      expect(result.status).toBe('active');
    }
  });

  it('ohne PILOT_MODE und ohne Record gibt free zurueck', async () => {
    delete process.env.PILOT_MODE;
    const supabase = createMockSupabase(null);
    const result = await requireSubscription(supabase as never, 'user-1', 'free');
    expect(isNextResponse(result)).toBe(false);
    if (!isNextResponse(result)) {
      expect(result.plan).toBe('free');
    }
  });

  it('ohne PILOT_MODE und ohne Record gibt 403 fuer Plus zurueck', async () => {
    delete process.env.PILOT_MODE;
    const supabase = createMockSupabase(null);
    const result = await requireSubscription(supabase as never, 'user-1', 'plus');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      expect(result.status).toBe(403);
      const body = await getResponseBody(result);
      expect(body.reason).toBe('plan_insufficient');
    }
  });

  it('optionaler Feature-Check blockiert fehlendes Feature', async () => {
    const supabase = createMockSupabase({ plan: 'free', status: 'active' });
    const result = await requireSubscription(supabase as never, 'user-1', 'free', {
      feature: 'medications',
    });
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      const body = await getResponseBody(result);
      expect(body.reason).toBe('feature_missing');
    }
  });

  it('optionaler Feature-Check laesst vorhandenes Feature durch', async () => {
    const supabase = createMockSupabase({ plan: 'plus', status: 'active' });
    const result = await requireSubscription(supabase as never, 'user-1', 'free', {
      feature: 'medications',
    });
    expect(isNextResponse(result)).toBe(false);
  });
});

describe('requireOrgAccess', () => {
  it('gueltiges Mitglied gibt Objekt zurueck', async () => {
    const supabase = createMockSupabase({ role: 'admin', org_id: 'org-1' });
    const result = await requireOrgAccess(supabase as never, 'user-1', 'org-1');
    expect(isNextResponse(result)).toBe(false);
    if (!isNextResponse(result)) {
      expect(result.role).toBe('admin');
    }
  });

  it('kein Mitglied gibt 403 zurueck', async () => {
    const supabase = createMockSupabase(null, { message: 'not found' });
    const result = await requireOrgAccess(supabase as never, 'user-1', 'org-1');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      expect(result.status).toBe(403);
      const body = await getResponseBody(result);
      expect(body.code).toBe('TENANT_ACCESS_REQUIRED');
    }
  });

  it('Viewer bei Admin-Anforderung gibt 403 zurueck', async () => {
    const supabase = createMockSupabase({ role: 'viewer', org_id: 'org-1' });
    const result = await requireOrgAccess(supabase as never, 'user-1', 'org-1', 'admin');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      expect(result.status).toBe(403);
      const body = await getResponseBody(result);
      expect(body.code).toBe('ROLE_REQUIRED');
      expect(body.requiredRole).toBe('admin');
    }
  });
});

describe('requireDoctorAccess', () => {
  it('gueltiges Profil gibt Objekt zurueck', async () => {
    const supabase = createMockSupabase({ user_id: 'doc-1', visible: true });
    const result = await requireDoctorAccess(supabase as never, 'doc-1');
    expect(isNextResponse(result)).toBe(false);
    if (!isNextResponse(result)) {
      expect(result.user_id).toBe('doc-1');
    }
  });

  it('kein Profil gibt 403 zurueck', async () => {
    const supabase = createMockSupabase(null);
    const result = await requireDoctorAccess(supabase as never, 'user-1');
    expect(isNextResponse(result)).toBe(true);
    if (isNextResponse(result)) {
      expect(result.status).toBe(403);
      const body = await getResponseBody(result);
      expect(body.code).toBe('ROLE_REQUIRED');
      expect(body.requiredRole).toBe('doctor');
    }
  });
});

describe('unauthorizedResponse', () => {
  it('gibt 401 mit korrektem Body zurueck', async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);
    const body = await getResponseBody(response);
    expect(body.error).toBe('Nicht authentifiziert');
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
