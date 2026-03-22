// app/(app)/vouching/page.tsx
// Nachbar-Vouching: Unverifizierte Nachbarn bestaetigen
'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Users, CircleCheck } from 'lucide-react';
import { PageHeader } from "@/components/ui/page-header";

interface UnverifiedNeighbor {
  id: string;
  display_name: string;
  street: string;
  house_number: string;
  vouch_count: number;
  already_vouched: boolean;
}

export default function VouchingPage() {
  const [neighbors, setNeighbors] = useState<UnverifiedNeighbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [vouching, setVouching] = useState<string | null>(null);

  async function loadNeighbors() {
    setLoading(true);
    try {
      const res = await fetch('/api/vouching');
      if (res.ok) setNeighbors(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadNeighbors(); }, []);

  async function handleVouch(targetId: string) {
    setVouching(targetId);
    try {
      const res = await fetch('/api/vouching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetId }),
      });
      if (res.ok) {
        loadNeighbors();
      }
    } catch { /* silent */ }
    setVouching(null);
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <div>
            <div className="text-2xl font-bold text-anthrazit flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-quartier-green" />
              Nachbar-Verifikation
            </div>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              Bestaetigen Sie Nachbarn, die Sie persoenlich kennen. Nach 2 Bestaetigungen
              wird die Adresse verifiziert.
            </p>
          </div>
        }
        backHref="/dashboard"
      />

      {/* Liste */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      ) : neighbors.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            Keine unverifizierten Nachbarn in Ihrem Quartier.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {neighbors.map((neighbor) => (
            <div
              key={neighbor.id}
              className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-anthrazit truncate">
                  {neighbor.display_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {neighbor.street} {neighbor.house_number}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    neighbor.vouch_count >= 2
                      ? 'bg-quartier-green/10 text-quartier-green'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {neighbor.vouch_count}/2 Bestaetigungen
                  </span>
                </div>
              </div>

              {neighbor.already_vouched ? (
                <span className="flex items-center gap-1 text-sm text-quartier-green font-medium flex-shrink-0">
                  <CircleCheck className="h-4 w-4" />
                  Bestaetigt
                </span>
              ) : (
                <button
                  onClick={() => handleVouch(neighbor.id)}
                  disabled={vouching === neighbor.id}
                  className="flex-shrink-0 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green/90 disabled:opacity-50"
                >
                  {vouching === neighbor.id ? 'Wird gesendet...' : 'Ich kenne diese Person'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
