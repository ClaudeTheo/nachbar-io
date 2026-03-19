import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkInviteLimit,
  getUserPlan,
  buildSmsMessage,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  validatePhone,
  getInviteStats,
} from '@/lib/invitations';

// Mock Supabase Client
function createMockSupabase(responses: Record<string, unknown> = {}) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: responses.maybeSingle ?? null }),
    single: vi.fn().mockResolvedValue({ data: responses.single ?? null }),
  };

  // count-Abfrage: select('id', { count: 'exact', head: true })
  const countQuery = {
    select: vi.fn().mockImplementation((_col: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count === 'exact') {
        return {
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ count: responses.count ?? 0 }),
        };
      }
      return mockQuery;
    }),
    from: vi.fn().mockReturnThis(),
  };

  return {
    from: vi.fn().mockImplementation(() => countQuery),
  };
}

// ============================================================
// validatePhone
// ============================================================
describe('validatePhone', () => {
  it('akzeptiert deutsche Mobilnummer mit 0-Prefix', () => {
    const result = validatePhone('0171 1234567');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('+491711234567');
  });

  it('akzeptiert E.164-Format direkt', () => {
    const result = validatePhone('+491711234567');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('+491711234567');
  });

  it('akzeptiert Nummer mit Klammern und Bindestrichen', () => {
    const result = validatePhone('(0171) 123-4567');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('+491711234567');
  });

  it('akzeptiert 00-Prefix (internationales Format)', () => {
    const result = validatePhone('00491711234567');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('+491711234567');
  });

  it('lehnt zu kurze Nummern ab', () => {
    const result = validatePhone('123');
    expect(result.valid).toBe(false);
  });

  it('lehnt leere Eingabe ab', () => {
    const result = validatePhone('');
    expect(result.valid).toBe(false);
  });

  it('akzeptiert oesterreichische Nummer', () => {
    const result = validatePhone('+436641234567');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('+436641234567');
  });

  it('akzeptiert Schweizer Nummer', () => {
    const result = validatePhone('+41791234567');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('+41791234567');
  });
});

// ============================================================
// buildSmsMessage
// ============================================================
describe('buildSmsMessage', () => {
  it('erstellt personalisierte Nachricht mit Empfaengername', () => {
    const msg = buildSmsMessage('Thomas', 'Frau Müller', 'https://quartierapp.de/register?invite=ABC');
    expect(msg).toContain('Hallo Frau Müller');
    expect(msg).toContain('Thomas');
    expect(msg).toContain('QuartierApp');
    expect(msg).toContain('https://quartierapp.de/register?invite=ABC');
  });

  it('erstellt generische Nachricht ohne Empfaengername', () => {
    const msg = buildSmsMessage('Thomas', undefined, 'https://quartierapp.de/register?invite=ABC');
    expect(msg).not.toContain('Hallo ');
    expect(msg).toContain('Thomas');
    expect(msg).toContain('QuartierApp');
  });
});

// ============================================================
// buildWhatsAppMessage
// ============================================================
describe('buildWhatsAppMessage', () => {
  it('erstellt personalisierte WhatsApp-Nachricht', () => {
    const msg = buildWhatsAppMessage('Thomas', 'Herr Schmidt', 'https://quartierapp.de/r');
    expect(msg).toContain('Hallo Herr Schmidt!');
    expect(msg).toContain('Thomas');
    expect(msg).toContain('QuartierApp');
  });

  it('erstellt generische WhatsApp-Nachricht ohne Empfaengername', () => {
    const msg = buildWhatsAppMessage('Thomas', undefined, 'https://quartierapp.de/r');
    expect(msg).toContain('Hallo!');
    expect(msg).toContain('Thomas');
  });
});

// ============================================================
// buildWhatsAppUrl
// ============================================================
describe('buildWhatsAppUrl', () => {
  it('erzeugt URL ohne Telefonnummer (Sharing)', () => {
    const url = buildWhatsAppUrl('Hallo Test');
    expect(url).toBe('https://wa.me/?text=Hallo%20Test');
  });

  it('erzeugt URL mit Telefonnummer (Direktnachricht)', () => {
    const url = buildWhatsAppUrl('Hallo Test', '+491711234567');
    expect(url).toBe('https://wa.me/491711234567?text=Hallo%20Test');
  });

  it('bereinigt Telefonnummer (entfernt +)', () => {
    const url = buildWhatsAppUrl('Hi', '+49 171 1234567');
    expect(url).toContain('https://wa.me/491711234567');
  });
});

// ============================================================
// checkInviteLimit
// ============================================================
describe('checkInviteLimit', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_PILOT_MODE', 'false');
  });

  it('erlaubt Einladung wenn unter Limit', async () => {
    const supabase = createMockSupabase({ count: 2 });
    const result = await checkInviteLimit(supabase as never, 'user-1', 'free');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.limit).toBe(5);
  });

  it('blockiert wenn Limit erreicht (free = 5)', async () => {
    const supabase = createMockSupabase({ count: 5 });
    const result = await checkInviteLimit(supabase as never, 'user-1', 'free');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('erlaubt mehr fuer Plus-Plan (50)', async () => {
    const supabase = createMockSupabase({ count: 10 });
    const result = await checkInviteLimit(supabase as never, 'user-1', 'plus');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40);
    expect(result.limit).toBe(50);
  });
});

// ============================================================
// getUserPlan
// ============================================================
describe('getUserPlan', () => {
  it('gibt free zurueck wenn keine Subscription existiert', async () => {
    // Mock: from().select().eq().eq().maybeSingle()
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const mock = { from: vi.fn().mockReturnValue(mockChain) };
    const plan = await getUserPlan(mock as never, 'user-1');
    expect(plan).toBe('free');
  });

  it('gibt aktiven Plan zurueck', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { plan: 'plus', status: 'active' } }),
    };
    const mock = { from: vi.fn().mockReturnValue(mockChain) };
    const plan = await getUserPlan(mock as never, 'user-1');
    expect(plan).toBe('plus');
  });
});

// ============================================================
// getInviteStats
// ============================================================
describe('getInviteStats', () => {
  it('zaehlt Einladungen korrekt', async () => {
    const mockData = [
      { status: 'sent' },
      { status: 'sent' },
      { status: 'converted' },
      { status: 'expired' },
      { status: 'accepted' },
    ];
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: mockData }),
    };
    const mock = { from: vi.fn().mockReturnValue(mockChain) };
    const stats = await getInviteStats(mock as never, 'user-1');
    expect(stats.total).toBe(5);
    expect(stats.pending).toBe(2);
    expect(stats.converted).toBe(2); // 'converted' + 'accepted'
    expect(stats.expired).toBe(1);
  });

  it('gibt Nullen zurueck bei leerer Liste', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null }),
    };
    const mock = { from: vi.fn().mockReturnValue(mockChain) };
    const stats = await getInviteStats(mock as never, 'user-1');
    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.converted).toBe(0);
    expect(stats.expired).toBe(0);
  });
});
