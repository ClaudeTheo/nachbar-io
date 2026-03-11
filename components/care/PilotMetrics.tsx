// components/care/PilotMetrics.tsx
// Nachbar.io — Pilot-Kennzahlen fuer Praesentationen
'use client';

import { useEffect, useState } from 'react';
import { Printer, TrendingUp, Shield } from 'lucide-react';

interface OverviewData {
  platform: { totalUsers: number; activeSeniors: number; registeredHelpers: number; verifiedHelpers: number; helperCoverageRatio: number; };
  operations: {
    sosAlerts: { total: number; last30Days: number; avgResponseMinutes: number | null; resolutionRate: number; };
    checkins: { total: number; last30Days: number; complianceRate: number; };
    medications: { activePrescriptions: number; complianceRate: number; };
    appointments: { total: number; upcoming: number; };
  };
  subscriptions: { distribution: Record<string, number>; totalPaid: number; trialActive: number; };
  system: { documentsGenerated: number; auditEntries: number; lastCronRun: string | null; };
  generatedAt: string;
}

export function PilotMetrics() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/care/stats/overview');
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse rounded-xl border bg-card p-6 h-64" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* 30-Tage Aktivitaet */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-[#4CAF87]" />
          <h3 className="text-sm font-semibold text-[#2D3142]">30-Tage Aktivitaet</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-[#2D3142]">{data.operations.checkins.last30Days}</p>
            <p className="text-xs text-muted-foreground mt-1">Check-ins</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-600">{data.operations.sosAlerts.last30Days}</p>
            <p className="text-xs text-muted-foreground mt-1">SOS-Alarme</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#4CAF87]">{data.operations.medications.complianceRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Med.-Compliance</p>
          </div>
        </div>
      </div>

      {/* Helfer-Netzwerk */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-[#2D3142]">Helfer-Netzwerk</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-[#2D3142]">{data.platform.registeredHelpers}</p>
            <p className="text-xs text-muted-foreground mt-1">Registriert</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#4CAF87]">{data.platform.verifiedHelpers}</p>
            <p className="text-xs text-muted-foreground mt-1">Verifiziert</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">{data.platform.helperCoverageRatio}x</p>
            <p className="text-xs text-muted-foreground mt-1">Abdeckung/Senior</p>
          </div>
        </div>
      </div>

      {/* Drucken */}
      <button
        onClick={() => window.print()}
        className="no-print w-full sm:w-auto rounded-lg border px-4 py-2 text-sm font-medium text-[#2D3142] hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Kennzahlen drucken
      </button>
    </div>
  );
}
