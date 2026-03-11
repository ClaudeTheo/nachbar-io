// components/care/SystemOverview.tsx
// Nachbar.io — System-Uebersicht fuer Admin-Dashboard
'use client';

import { useEffect, useState } from 'react';
import { Heart, Users, AlertTriangle, Clock, Activity } from 'lucide-react';

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

export function SystemOverview() {
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

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse rounded-xl border bg-card p-4 h-24" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Daten konnten nicht geladen werden.</p>;
  }

  const metrics = [
    { label: 'Aktive Senioren', value: data.platform.activeSeniors, icon: Heart, color: 'text-[#4CAF87]', bgColor: 'bg-[#4CAF87]/10' },
    { label: 'Verifizierte Helfer', value: `${data.platform.verifiedHelpers} (${data.platform.helperCoverageRatio}x)`, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'SOS Aufloesungsrate', value: `${data.operations.sosAlerts.resolutionRate}%`, icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { label: 'Check-in Compliance', value: `${data.operations.checkins.complianceRate}%`, icon: Clock, color: 'text-[#4CAF87]', bgColor: 'bg-[#4CAF87]/10' },
  ];

  // Abo-Verteilung als Balken
  const planColors: Record<string, string> = { free: 'bg-gray-300', basic: 'bg-blue-400', family: 'bg-[#4CAF87]', professional: 'bg-purple-500', premium: 'bg-amber-500' };
  const planLabels: Record<string, string> = { free: 'Kostenlos', basic: 'Basis', family: 'Familie', professional: 'Professionell', premium: 'Premium' };
  const totalSubs = Object.values(data.subscriptions.distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Kennzahlen-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border bg-card p-4">
            <div className={`rounded-lg ${m.bgColor} p-2 w-fit mb-2`}>
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold text-[#2D3142]">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Abo-Verteilung */}
      {totalSubs > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Abo-Verteilung</h3>
          <div className="flex rounded-full overflow-hidden h-4 bg-gray-100">
            {Object.entries(data.subscriptions.distribution).map(([plan, count]) => {
              if (count === 0) return null;
              const width = (count / totalSubs) * 100;
              return <div key={plan} className={`${planColors[plan] ?? 'bg-gray-400'} h-full`} style={{ width: `${width}%` }} title={`${planLabels[plan]}: ${count}`} />;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(data.subscriptions.distribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-1 text-xs">
                <div className={`h-2.5 w-2.5 rounded-full ${planColors[plan] ?? 'bg-gray-400'}`} />
                <span className="text-muted-foreground">{planLabels[plan]}: {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System-Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="rounded-lg bg-gray-50 p-2 w-fit mb-2"><Activity className="h-4 w-4 text-muted-foreground" /></div>
          <p className="text-lg font-bold text-[#2D3142]">{data.system.auditEntries}</p>
          <p className="text-xs text-muted-foreground">Audit-Eintraege</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-lg font-bold text-[#2D3142]">{data.system.documentsGenerated}</p>
          <p className="text-xs text-muted-foreground">Berichte erstellt</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-lg font-bold text-[#2D3142]">{data.operations.medications.activePrescriptions}</p>
          <p className="text-xs text-muted-foreground">Aktive Medikamente</p>
        </div>
      </div>
    </div>
  );
}
