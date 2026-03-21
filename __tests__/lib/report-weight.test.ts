// Tests fuer Report-Gewichtung und Anti-Brigading
import { describe, it, expect } from 'vitest';
import { calculateReportWeight, checkAntiBrigading } from '@/lib/moderation/report-weight';

describe('calculateReportWeight', () => {
  it('verifizierter Account aelter als 30 Tage = 1.0', () => {
    const weight = calculateReportWeight({
      reporterVerified: true,
      accountAgeDays: 60,
      householdReportsOnSameContent: 0,
    });
    expect(weight).toBe(1.0);
  });

  it('frischer Account (10 Tage) bekommt halbes Gewicht', () => {
    const weight = calculateReportWeight({
      reporterVerified: true,
      accountAgeDays: 10,
      householdReportsOnSameContent: 0,
    });
    expect(weight).toBe(0.5);
  });

  it('nicht-verifizierter Account bekommt 0.3', () => {
    const weight = calculateReportWeight({
      reporterVerified: false,
      accountAgeDays: 60,
      householdReportsOnSameContent: 0,
    });
    expect(weight).toBe(0.3);
  });

  it('nicht-verifiziert + frisch = 0.15', () => {
    const weight = calculateReportWeight({
      reporterVerified: false,
      accountAgeDays: 10,
      householdReportsOnSameContent: 0,
    });
    expect(weight).toBeCloseTo(0.15);
  });

  it('Mehrfachmeldung aus Haushalt (1 vorherige) reduziert auf 0.3', () => {
    const weight = calculateReportWeight({
      reporterVerified: true,
      accountAgeDays: 60,
      householdReportsOnSameContent: 1,
    });
    expect(weight).toBe(0.3);
  });

  it('Dritte Meldung aus Haushalt (2+ vorherige) = 0', () => {
    const weight = calculateReportWeight({
      reporterVerified: true,
      accountAgeDays: 60,
      householdReportsOnSameContent: 2,
    });
    expect(weight).toBe(0);
  });

  it('nicht-verifiziert + Haushalt-Doppelmeldung = sehr niedrig', () => {
    const weight = calculateReportWeight({
      reporterVerified: false,
      accountAgeDays: 60,
      householdReportsOnSameContent: 1,
    });
    expect(weight).toBeCloseTo(0.09);
  });
});

describe('checkAntiBrigading', () => {
  it('erkennt Brigading: 4 Meldungen aus 1 Quartier in 30 Min', () => {
    const result = checkAntiBrigading({
      reportsInLast30Min: 4,
      uniqueQuarters: 1,
      uniqueReporters: 3,
    });
    expect(result.isBrigading).toBe(true);
    expect(result.reason).toBeDefined();
  });

  it('erkennt Brigading: genau 3 Meldungen aus 1 Quartier', () => {
    const result = checkAntiBrigading({
      reportsInLast30Min: 3,
      uniqueQuarters: 1,
      uniqueReporters: 3,
    });
    expect(result.isBrigading).toBe(true);
  });

  it('kein Brigading: 2 Meldungen aus 2 Quartieren', () => {
    const result = checkAntiBrigading({
      reportsInLast30Min: 2,
      uniqueQuarters: 2,
      uniqueReporters: 2,
    });
    expect(result.isBrigading).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it('kein Brigading: 5 Meldungen aus 3 Quartieren', () => {
    const result = checkAntiBrigading({
      reportsInLast30Min: 5,
      uniqueQuarters: 3,
      uniqueReporters: 5,
    });
    expect(result.isBrigading).toBe(false);
  });

  it('kein Brigading: nur 1 Meldung', () => {
    const result = checkAntiBrigading({
      reportsInLast30Min: 1,
      uniqueQuarters: 1,
      uniqueReporters: 1,
    });
    expect(result.isBrigading).toBe(false);
  });
});
