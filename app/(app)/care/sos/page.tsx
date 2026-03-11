'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { SosAlertCard } from '@/components/care/SosAlertCard';
import type { CareSosAlert } from '@/lib/care/types';

export default function SosOverviewPage() {
  const [alerts, setAlerts] = useState<CareSosAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/care/sos');
      if (res.ok) setAlerts(await res.json());
      setLoading(false);
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('care-sos-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_sos_alerts' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <Link href="/care" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit">
          <ArrowLeft className="h-4 w-4" />
          Zurueck
        </Link>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-alert-amber" />
          SOS-Alarme
        </h1>
      </div>
      {alerts.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          Keine aktiven SOS-Alarme
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Link key={alert.id} href={`/care/sos/${alert.id}`}>
              <SosAlertCard alert={alert} showActions={false} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
