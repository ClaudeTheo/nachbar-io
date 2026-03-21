// __tests__/api/moderation-api.test.ts
// Tests fuer Moderation-Types, Report-Weight und Pre-Filter
import { describe, it, expect } from 'vitest';
import type { ReportReason, BlockLevel, ModerationChannel } from '@/lib/moderation/types';
import { calculateReportWeight } from '@/lib/moderation/report-weight';
import { preFilter } from '@/lib/moderation/word-filter';

describe('Moderation Types', () => {
  it('ReportReason hat 7 gueltige Werte', () => {
    const validReasons: ReportReason[] = [
      'spam', 'harassment', 'hate', 'scam', 'inappropriate', 'wrong_category', 'other',
    ];
    expect(validReasons).toHaveLength(7);
    // Typcheck: alle Werte muessen ReportReason sein (Compile-Zeit)
    validReasons.forEach((r) => {
      expect(typeof r).toBe('string');
    });
  });

  it('BlockLevel hat 3 Stufen', () => {
    const levels: BlockLevel[] = ['mute', 'block', 'safety'];
    expect(levels).toHaveLength(3);
  });

  it('ModerationChannel hat 5 Kanaele', () => {
    const channels: ModerationChannel[] = ['board', 'marketplace', 'chat', 'comment', 'profile'];
    expect(channels).toHaveLength(5);
  });
});

describe('calculateReportWeight', () => {
  it('verifiziert + alt = volle Gewichtung 1.0', () => {
    const weight = calculateReportWeight({
      reporterVerified: true,
      accountAgeDays: 90,
      householdReportsOnSameContent: 0,
    });
    expect(weight).toBe(1.0);
  });

  it('nicht-verifiziert + neu = stark reduziert', () => {
    const weight = calculateReportWeight({
      reporterVerified: false,
      accountAgeDays: 5,
      householdReportsOnSameContent: 0,
    });
    // 0.3 (trust) * 0.5 (age) * 1.0 (household) = 0.15
    expect(weight).toBe(0.15);
  });

  it('2+ Haushalt-Reports = Gewicht 0', () => {
    const weight = calculateReportWeight({
      reporterVerified: true,
      accountAgeDays: 90,
      householdReportsOnSameContent: 2,
    });
    expect(weight).toBe(0);
  });
});

describe('preFilter Integration', () => {
  it('blockierter Text wird erkannt', () => {
    const result = preFilter('Du bist ein Hurensohn');
    expect(result.blocked).toBe(true);
    expect(result.matchedPatterns).toContain('beleidigung');
  });

  it('normaler Text wird nicht blockiert', () => {
    const result = preFilter('Hallo, hat jemand einen Rasenmaeher zu verleihen?');
    expect(result.blocked).toBe(false);
    expect(result.suspicious).toBe(false);
    expect(result.matchedPatterns).toHaveLength(0);
  });

  it('verdaechtiger Text wird als suspicious markiert', () => {
    const result = preFilter('Schreib mir auf WhatsApp fuer das Angebot');
    expect(result.blocked).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.matchedPatterns).toContain('off-platform-kontakt');
  });
});
