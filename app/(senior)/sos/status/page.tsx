'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SeniorStatusScreen } from '@/components/care/senior/SeniorStatusScreen';
import type { CareSosAlert } from '@/lib/care/types';

export default function SeniorSosStatusPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Laden...</div>}>
      <SeniorSosStatusContent />
    </Suspense>
  );
}

function SeniorSosStatusContent() {
  const searchParams = useSearchParams();
  const alertId = searchParams.get('id');
  const [alert, setAlert] = useState<CareSosAlert | null>(null);

  useEffect(() => {
    if (!alertId) return;

    async function load() {
      const res = await fetch(`/api/care/sos/${alertId}`);
      if (res.ok) setAlert(await res.json());
    }
    load();

    const supabase = createClient();
    const channel = supabase
      .channel('senior-sos-' + alertId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_sos_alerts', filter: `id=eq.${alertId}` }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [alertId]);

  if (alert?.status === 'accepted' || alert?.status === 'helper_enroute') {
    return (
      <div className="text-center py-8 space-y-6">
        <div className="text-8xl">🏃</div>
        <h1 className="text-4xl font-bold text-green-600">Hilfe ist unterwegs!</h1>
        <p className="text-xl text-gray-600">Jemand kommt zu Ihnen.</p>
      </div>
    );
  }

  return <SeniorStatusScreen type="sos_sent" autoCloseSeconds={30} />;
}
