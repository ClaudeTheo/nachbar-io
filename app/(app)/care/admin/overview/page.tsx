// app/(app)/care/admin/overview/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SystemOverview } from '@/components/care/SystemOverview';
import { PilotMetrics } from '@/components/care/PilotMetrics';
import { useAuth } from '@/hooks/use-auth';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    const supabase = createClient();
    async function checkAdmin() {
      const { data } = await supabase.from('users').select('is_admin').eq('id', user!.id).single();
      setIsAdmin(data?.is_admin === true);
    }
    checkAdmin();
  }, [user]);

  if (isAdmin === null) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-muted-foreground">Diese Seite ist nur fuer Administratoren zugaenglich.</p>
        <Link href="/care" className="text-sm text-[#4CAF87] mt-2 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Zurueck zum Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3142] flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[#4CAF87]" />
          Plattform-Uebersicht
        </h1>
        <p className="text-muted-foreground mt-1">
          Kennzahlen fuer Pilot-Betrieb und Investoren.
        </p>
      </div>

      <SystemOverview />

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold text-[#2D3142] mb-4">Pilot-Kennzahlen</h2>
        <PilotMetrics />
      </div>

      {/* JSON-Export Link */}
      <div className="text-center">
        <a
          href="/api/care/stats/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-[#2D3142] underline"
        >
          Rohdaten als JSON exportieren
        </a>
      </div>
    </div>
  );
}
