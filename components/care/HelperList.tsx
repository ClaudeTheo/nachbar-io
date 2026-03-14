'use client';

// Liste aller Helfer eines Seniors, gruppiert nach Rolle

import { Users } from 'lucide-react';
import { useState } from 'react';
import { useHelpers } from '@/lib/care/hooks/useHelpers';
import type { CareHelper, CareHelperRole } from '@/lib/care/types';
import { CARE_HELPER_ROLES } from '@/lib/care/constants';
import { HelperCard } from './HelperCard';

interface HelperListProps {
  /** Optional: Nur Helfer fuer diesen Senior anzeigen */
  seniorId?: string;
  /** Wenn true: alle Helfer inkl. pending anzeigen (Admin-Modus) */
  showPending?: boolean;
}

// Ladezustand: Platzhalter-Skelett
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-200" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 rounded-full bg-gray-200" />
                <div className="h-5 w-20 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helfer nach Rolle gruppieren, Reihenfolge aus CARE_HELPER_ROLES beibehalten
function groupByRole(helpers: CareHelper[]): Map<CareHelperRole, CareHelper[]> {
  const map = new Map<CareHelperRole, CareHelper[]>();
  // Reihenfolge aus Konstante initialisieren
  for (const roleConfig of CARE_HELPER_ROLES) {
    map.set(roleConfig.id, []);
  }
  for (const helper of helpers) {
    const existing = map.get(helper.role);
    if (existing) {
      existing.push(helper);
    }
  }
  return map;
}

export function HelperList({ seniorId, showPending = false }: HelperListProps) {
  const { helpers, loading, refetch } = useHelpers(seniorId);
  // ID des Helpers, bei dem gerade eine Verifikations-Aktion laeuft
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Helfer-Liste filtern: ohne showPending nur verifizierte Helfer anzeigen
  const visibleHelpers = showPending
    ? helpers
    : helpers.filter((h) => h.verification_status === 'verified');

  // Verifikations-Status per API aktualisieren
  async function handleVerify(id: string) {
    if (processingId) return;
    setProcessingId(id);
    try {
      await fetch(`/api/care/helpers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status: 'verified' }),
      });
      await refetch();
    } catch {
      // Fehler still ignorieren — refetch zeigt aktuellen Stand
    }
    setProcessingId(null);
  }

  // Helfer sperren per API
  async function handleRevoke(id: string) {
    if (processingId) return;
    setProcessingId(id);
    try {
      await fetch(`/api/care/helpers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status: 'revoked' }),
      });
      await refetch();
    } catch {
      // Fehler still ignorieren — refetch zeigt aktuellen Stand
    }
    setProcessingId(null);
  }

  if (loading) return <LoadingSkeleton />;

  if (visibleHelpers.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Keine Helfer registriert.</p>
      </div>
    );
  }

  const grouped = groupByRole(visibleHelpers);

  return (
    <div className="space-y-6">
      {CARE_HELPER_ROLES.map(({ id: roleId, label: roleLabel }) => {
        const roleHelpers = grouped.get(roleId) ?? [];
        if (roleHelpers.length === 0) return null;

        return (
          <section key={roleId}>
            {/* Rollen-Ueberschrift */}
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {roleLabel} ({roleHelpers.length})
            </h2>
            <div className="space-y-3">
              {roleHelpers.map((helper) => (
                <HelperCard
                  key={helper.id}
                  helper={helper}
                  showVerifyButton={showPending}
                  onVerify={processingId === null ? handleVerify : undefined}
                  onRevoke={processingId === null ? handleRevoke : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
