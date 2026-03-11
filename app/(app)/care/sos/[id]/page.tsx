'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { SosAlertCard } from '@/components/care/SosAlertCard';
import { SosStatusTracker } from '@/components/care/SosStatusTracker';
import type { CareSosAlert } from '@/lib/care/types';

export default function SosDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [alert, setAlert] = useState<CareSosAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/care/sos/${id}`);
      if (res.ok) setAlert(await res.json());
      setLoading(false);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('care-sos-detail-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_sos_alerts', filter: `id=eq.${id}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function handleResolve() {
    await fetch(`/api/care/sos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    router.push('/care/sos');
  }

  async function handleEscalate() {
    await fetch(`/api/care/sos/${id}/escalate`, { method: 'POST' });
  }

  if (loading || !alert) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const isOpen = !['resolved', 'cancelled'].includes(alert.status);

  return (
    <div className="px-4 py-6 space-y-4">
      <Link href="/care/sos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit">
        <ArrowLeft className="h-4 w-4" />
        Alle SOS-Alarme
      </Link>
      <SosAlertCard alert={alert} showActions={true} />
      <SosStatusTracker alert={alert} />
      {alert.responses && alert.responses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Reaktionen</h3>
          {alert.responses.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <Shield className="h-4 w-4 text-quartier-green" />
              <div>
                <span className="font-medium text-sm">{r.helper?.display_name ?? 'Helfer'}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {r.response_type === 'accepted' && `✅ Akzeptiert${r.eta_minutes ? ` (${r.eta_minutes} Min.)` : ''}`}
                  {r.response_type === 'arrived' && '📍 Angekommen'}
                  {r.response_type === 'completed' && '✓ Abgeschlossen'}
                  {r.response_type === 'declined' && '— Abgelehnt'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {isOpen && (
        <div className="flex gap-2 pt-2">
          <button onClick={handleResolve} className="flex-1 rounded-lg bg-quartier-green py-3 font-bold text-white">
            ✅ SOS schliessen
          </button>
          {alert.current_escalation_level < 4 && (
            <button onClick={handleEscalate} className="flex-1 rounded-lg border-2 border-alert-amber py-3 font-bold text-alert-amber">
              ⬆️ Eskalieren
            </button>
          )}
        </div>
      )}
    </div>
  );
}
