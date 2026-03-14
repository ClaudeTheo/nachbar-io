// app/(app)/care/meine-senioren/[seniorId]/page.tsx
// Detail-Seite: Medikamente, Check-ins und SOS-Verlauf eines Seniors
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pill, Clock, AlertTriangle, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCareRole } from '@/lib/care/hooks/useCareRole';
import { createClient } from '@/lib/supabase/client';

interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  schedule: string;
  status?: string;
}

interface CheckinEntry {
  id: string;
  status: string;
  scheduled_at: string;
  completed_at: string | null;
  mood?: string;
}

interface SosEntry {
  id: string;
  category: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

type Tab = 'medikamente' | 'checkins' | 'sos';

export default function SeniorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seniorId = params.seniorId as string;
  const { role, loading: roleLoading } = useCareRole(seniorId);

  const [seniorName, setSeniorName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('medikamente');
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Zugriffspruefung: Redirect wenn keine Berechtigung
  useEffect(() => {
    if (!roleLoading && role === 'none') {
      router.push('/care/meine-senioren');
    }
  }, [role, roleLoading, router]);

  // Senior-Name laden
  useEffect(() => {
    if (!seniorId) return;
    const supabase = createClient();
    supabase
      .from('users')
      .select('display_name')
      .eq('id', seniorId)
      .single()
      .then(({ data }) => {
        setSeniorName(data?.display_name ?? 'Senior');
      });
  }, [seniorId]);

  // Daten pro Tab laden
  useEffect(() => {
    if (!seniorId || role === 'none') return;

    async function loadData() {
      setLoading(true);
      try {
        if (activeTab === 'medikamente') {
          const res = await fetch(`/api/care/medications?senior_id=${seniorId}`);
          if (res.ok) setMedications(await res.json());
        } else if (activeTab === 'checkins') {
          const res = await fetch(`/api/care/checkin/status?senior_id=${seniorId}`);
          if (res.ok) {
            const data = await res.json();
            setCheckins(data.today ?? []);
          }
        } else if (activeTab === 'sos') {
          const res = await fetch(`/api/care/sos?senior_id=${seniorId}`);
          if (res.ok) setSosAlerts(await res.json());
        }
      } catch { /* silent */ }
      setLoading(false);
    }

    loadData();
  }, [seniorId, activeTab, role]);

  if (roleLoading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (role === 'none') return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'medikamente', label: 'Medikamente', icon: <Pill className="h-4 w-4" /> },
    { key: 'checkins', label: 'Check-ins', icon: <Clock className="h-4 w-4" /> },
    { key: 'sos', label: 'SOS-Verlauf', icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Zurueck-Link */}
      <Link
        href="/care/meine-senioren"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck zur Uebersicht
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit">{seniorName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === 'relative' ? 'Angehoerige/r' : role === 'care_service' ? 'Pflegedienst' : 'Helfer'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-quartier-green text-quartier-green'
                : 'border-transparent text-muted-foreground hover:text-anthrazit'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      ) : (
        <>
          {/* Medikamente-Tab */}
          {activeTab === 'medikamente' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {medications.length} Medikament{medications.length !== 1 ? 'e' : ''}
                </h2>
                {(role === 'relative' || role === 'care_service' || role === 'admin') && (
                  <Link
                    href={`/care/medications/new?senior_id=${seniorId}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-1.5 text-sm font-medium text-white hover:bg-quartier-green/90"
                  >
                    <Plus className="h-4 w-4" />
                    Neues Medikament
                  </Link>
                )}
              </div>
              {medications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine Medikamente eingetragen.
                </p>
              ) : (
                medications.map((med) => (
                  <div key={med.id} className="rounded-xl border bg-card p-4">
                    <p className="font-medium text-anthrazit">{med.name}</p>
                    <p className="text-sm text-muted-foreground">{med.dosage}</p>
                    <p className="text-xs text-muted-foreground mt-1">{med.schedule}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Check-ins-Tab */}
          {activeTab === 'checkins' && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Heutige Check-ins
              </h2>
              {checkins.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Noch keine Check-ins fuer heute.
                </p>
              ) : (
                checkins.map((ci) => (
                  <div key={ci.id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-anthrazit">
                        {new Date(ci.scheduled_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {ci.mood && (
                        <p className="text-xs text-muted-foreground">Stimmung: {ci.mood}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      ci.completed_at
                        ? 'bg-quartier-green/10 text-quartier-green'
                        : ci.status === 'missed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {ci.completed_at ? 'Erledigt' : ci.status === 'missed' ? 'Verpasst' : 'Ausstehend'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SOS-Tab */}
          {activeTab === 'sos' && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                SOS-Verlauf
              </h2>
              {sosAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine SOS-Alarme vorhanden.
                </p>
              ) : (
                sosAlerts.map((sos) => (
                  <div key={sos.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-anthrazit capitalize">
                        {sos.category.replace(/_/g, ' ')}
                      </p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        sos.status === 'resolved'
                          ? 'bg-quartier-green/10 text-quartier-green'
                          : sos.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {sos.status === 'resolved' ? 'Geloest' : sos.status === 'cancelled' ? 'Abgebrochen' : 'Aktiv'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(sos.created_at).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
