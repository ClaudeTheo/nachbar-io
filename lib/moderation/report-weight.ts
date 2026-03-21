// Report-Gewichtung und Anti-Brigading
// Verhindert Missbrauch des Meldesystems durch gewichtete Bewertung

export interface ReportContext {
  reporterVerified: boolean;
  accountAgeDays: number;
  householdReportsOnSameContent: number;
}

export interface BrigadingContext {
  reportsInLast30Min: number;
  uniqueQuarters: number;
  uniqueReporters: number;
}

/**
 * Berechnet das Gewicht einer Meldung basierend auf Reporter-Vertrauen.
 *
 * Faktoren:
 * - Trust: verifiziert = 1.0, nicht-verifiziert = 0.3
 * - Account-Alter: < 30 Tage = 0.5 Multiplikator
 * - Haushalt-Dedup: 0 vorherige = 1.0, 1 vorherige = 0.3, 2+ = 0
 *
 * Ergebnis: Produkt aller Faktoren (0.0 bis 1.0)
 */
export function calculateReportWeight(ctx: ReportContext): number {
  // Trust-Faktor
  const trustFactor = ctx.reporterVerified ? 1.0 : 0.3;

  // Account-Alter-Faktor
  const ageFactor = ctx.accountAgeDays < 30 ? 0.5 : 1.0;

  // Haushalt-Deduplizierung
  let householdFactor: number;
  if (ctx.householdReportsOnSameContent === 0) {
    householdFactor = 1.0;
  } else if (ctx.householdReportsOnSameContent === 1) {
    householdFactor = 0.3;
  } else {
    householdFactor = 0;
  }

  return trustFactor * ageFactor * householdFactor;
}

/**
 * Prueft auf koordinierte Meldungsflut (Brigading).
 * Erkennt wenn 3+ Meldungen innerhalb von 30 Minuten aus einem einzigen Quartier kommen.
 */
export function checkAntiBrigading(ctx: BrigadingContext): { isBrigading: boolean; reason?: string } {
  // 3+ Meldungen in 30 Min aus nur 1 Quartier = Brigading
  if (ctx.reportsInLast30Min >= 3 && ctx.uniqueQuarters === 1) {
    return {
      isBrigading: true,
      reason: `${ctx.reportsInLast30Min} Meldungen von ${ctx.uniqueReporters} Nutzern aus 1 Quartier in 30 Minuten`,
    };
  }

  return { isBrigading: false };
}
