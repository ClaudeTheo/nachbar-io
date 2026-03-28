// app/api/hilfe/budget/route.ts
// Nachbar Hilfe — Entlastungsbetrag-Tracker: Monatsbudget und Verbrauch abfragen

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { BudgetSummary } from '@/modules/hilfe/services/types';

// Monatliches Budget nach § 45b SGB XI: 125 EUR + 6 EUR Eigenanteil-Reserve = 131 EUR
const MONTHLY_BUDGET_CENTS = 13100;

// GET /api/hilfe/budget — Budget-Zusammenfassung für den aktuellen Monat
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  // Aktuellen Monat bestimmen (erster und letzter Tag)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  // Sessions des aktuellen Monats laden (über help_matches verknüpft)
  // RLS sorgt dafür, dass nur eigene Sessions zurückgegeben werden
  const { data: sessions, error } = await supabase
    .from('help_sessions')
    .select('total_amount_cents')
    .gte('session_date', monthStart)
    .lte('session_date', monthEnd);

  if (error) {
    console.error('[hilfe/budget] Sessions laden fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Budget konnte nicht berechnet werden' }, { status: 500 });
  }

  const sessionList = sessions ?? [];
  const usedThisMonth = sessionList.reduce(
    (sum: number, s: { total_amount_cents: number }) => sum + (s.total_amount_cents ?? 0),
    0
  );
  const sessionsThisMonth = sessionList.length;
  const availableCents = MONTHLY_BUDGET_CENTS - usedThisMonth;

  const summary: BudgetSummary = {
    monthly_budget_cents: MONTHLY_BUDGET_CENTS,
    used_this_month_cents: usedThisMonth,
    available_cents: availableCents,
    carry_over_cents: 0, // Vereinfacht: Übertrag wird später implementiert
    sessions_this_month: sessionsThisMonth,
  };

  return NextResponse.json(summary);
}
