'use client';

// Nachbar Hilfe — Entlastungsbetrag-Tracker
// Zeigt monatliches Budget, Verbrauch und Fortschrittsbalken

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { BudgetSummary } from '@/lib/hilfe/types';

/** Cent-Betrag als EUR-String formatieren (z.B. 13100 → "131,00") */
function formatEur(cents: number): string {
  const abs = Math.abs(cents);
  const eur = Math.floor(abs / 100);
  const ct = abs % 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}${eur},${ct.toString().padStart(2, '0')}`;
}

export function BudgetTracker() {
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/hilfe/budget');
        if (!res.ok) throw new Error('Budget konnte nicht geladen werden');
        const data = await res.json();
        setBudget(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Budget wird geladen...
        </CardContent>
      </Card>
    );
  }

  if (error || !budget) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-600">
          {error ?? 'Budget konnte nicht geladen werden'}
        </CardContent>
      </Card>
    );
  }

  const percentage = budget.monthly_budget_cents > 0
    ? (budget.used_this_month_cents / budget.monthly_budget_cents) * 100
    : 0;

  // Farblogik: Gruen < 80%, Amber >= 80%, Rot > 100%
  let barColor = '#4CAF87'; // Gruen
  if (percentage > 100) {
    barColor = '#EF4444'; // Rot
  } else if (percentage >= 80) {
    barColor = '#F59E0B'; // Amber
  }

  const barWidth = Math.min(percentage, 100);

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Monatsbudget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fortschrittsbalken */}
        <div>
          <div
            className="h-4 w-full rounded-full bg-gray-200 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(percentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Budgetverbrauch"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${barWidth}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500 text-right">
            {Math.round(percentage)}%
          </p>
        </div>

        {/* Betraege */}
        <div className="space-y-2 text-base">
          <p>
            <span className="font-semibold">Verbraucht:</span>{' '}
            {formatEur(budget.used_this_month_cents)} EUR / {formatEur(budget.monthly_budget_cents)} EUR
          </p>
          <p>
            <span className="font-semibold">Verfuegbar:</span>{' '}
            <span className={budget.available_cents < 0 ? 'text-red-600 font-bold' : 'text-[#4CAF87] font-bold'}>
              {formatEur(budget.available_cents)} EUR
            </span>
          </p>
        </div>

        {/* Warnung bei > 80% */}
        {percentage >= 80 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Achtung: Mehr als 80% des monatlichen Budgets verbraucht
          </div>
        )}

        {/* Einsaetze */}
        <p className="text-sm text-gray-600">
          {budget.sessions_this_month} Einsaetze diesen Monat
        </p>

        {/* Hinweise */}
        <div className="space-y-2 text-sm text-gray-500">
          <p>
            Nicht genutzte Betraege sind bis zum 30.06. des Folgejahres uebertragbar
          </p>
          <p>
            Hinweis: Bis 3.000 EUR/Jahr steuerfrei (§3 Nr. 36 EStG)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
