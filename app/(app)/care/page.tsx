// app/(app)/care/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, AlertTriangle, Clock, ArrowRight, Pill, CalendarDays, Users, FileText, CreditCard, ScrollText, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { SosButton } from '@/components/care/SosButton';
import { SosAlertCard } from '@/components/care/SosAlertCard';
import type { CareSosAlert, CareAppointment } from '@/lib/care/types';

interface CheckinStatus {
  completedCount: number;
  totalCount: number;
  nextDue: string | null;
  allCompleted: boolean;
  checkinEnabled: boolean;
}

interface MedicationDueStatus {
  pendingCount: number;
  completedCount: number;
}

export default function CareDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<CareSosAlert[]>([]);
  const [medicationStatus, setMedicationStatus] = useState<MedicationDueStatus | null>(null);
  const [nextAppointment, setNextAppointment] = useState<CareAppointment | null>(null);
  const [helperCount, setHelperCount] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Aktuellen Nutzer laden + Admin-Check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
        setIsAdmin(data?.is_admin === true);
      }
    });
  }, []);

  // Check-in Status laden
  useEffect(() => {
    async function loadCheckinStatus() {
      try {
        const res = await fetch('/api/care/checkin/status');
        if (res.ok) setCheckinStatus(await res.json());
      } catch { /* silent */ }
    }
    loadCheckinStatus();
  }, []);

  // Aktive SOS-Alerts laden und per Realtime aktuell halten
  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch('/api/care/sos');
        if (res.ok) {
          const data = await res.json();
          setActiveAlerts(data);
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    loadAlerts();

    // Realtime-Abonnement fuer sofortige Aktualisierungen
    const supabase = createClient();
    const channel = supabase
      .channel('care-dashboard-sos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_sos_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Faellige Medikamente laden
  useEffect(() => {
    async function loadMedicationStatus() {
      try {
        const res = await fetch('/api/care/medications/due');
        if (res.ok) {
          const data: Array<{ status: string }> = await res.json();
          const pendingCount = data.filter((m) => m.status === 'pending').length;
          const completedCount = data.filter((m) => m.status === 'taken').length;
          setMedicationStatus({ pendingCount, completedCount });
        }
      } catch { /* silent */ }
    }
    loadMedicationStatus();
  }, []);

  // Naechsten Termin laden
  useEffect(() => {
    async function loadNextAppointment() {
      try {
        const res = await fetch('/api/care/appointments?upcoming=true');
        if (res.ok) {
          const data: CareAppointment[] = await res.json();
          setNextAppointment(data[0] ?? null);
        }
      } catch { /* silent */ }
    }
    loadNextAppointment();
  }, []);

  // Verifizierte Helfer laden
  useEffect(() => {
    async function loadHelperCount() {
      try {
        const res = await fetch('/api/care/helpers?status=verified');
        if (res.ok) {
          const data: unknown[] = await res.json();
          setHelperCount(data.length);
        }
      } catch { /* silent */ }
    }
    loadHelperCount();
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Heart className="h-6 w-6 text-quartier-green" />
          Pflege & Seniorenhilfe
        </h1>
        <p className="text-muted-foreground mt-1">Ihr persoenliches Pflege-Dashboard</p>
      </div>

      {/* SOS-Button (kompakt) */}
      <SosButton compact />

      {/* Status-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Check-in Status */}
        <Link
          href="/care/checkins"
          className="rounded-xl border bg-card p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Check-in
          </div>
          {checkinStatus ? (
            <div className="mt-1">
              {checkinStatus.allCompleted ? (
                <p className="text-lg font-semibold text-quartier-green">Alle erledigt</p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-anthrazit">
                    {checkinStatus.completedCount}/{checkinStatus.totalCount}
                  </p>
                  {checkinStatus.nextDue && (
                    <p className="text-xs text-muted-foreground">
                      Naechster: {checkinStatus.nextDue}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-lg font-semibold mt-1 text-muted-foreground">—</p>
          )}
        </Link>

        {/* SOS-Status */}
        <Link
          href="/care/sos"
          className="rounded-xl border bg-card p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            SOS-Status
          </div>
          {activeAlerts.length > 0 ? (
            <p className="text-lg font-semibold mt-1 text-emergency-red">
              {activeAlerts.length} aktiv
            </p>
          ) : (
            <p className="text-lg font-semibold mt-1 text-quartier-green">
              Kein Alarm
            </p>
          )}
        </Link>

        {/* Medikamente */}
        <Link
          href="/care/medications"
          className="rounded-xl border bg-card p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Pill className="h-4 w-4" />
            Medikamente
          </div>
          {medicationStatus !== null ? (
            <div className="mt-1">
              {medicationStatus.pendingCount === 0 ? (
                <p className="text-lg font-semibold text-quartier-green">Alle eingenommen</p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-anthrazit">
                    {medicationStatus.pendingCount} ausstehend
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {medicationStatus.completedCount} eingenommen
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="text-lg font-semibold mt-1 text-muted-foreground">—</p>
          )}
        </Link>

        {/* Termine */}
        <Link
          href="/care/appointments"
          className="rounded-xl border bg-card p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            Termine
          </div>
          {nextAppointment !== null ? (
            <div className="mt-1">
              <p className="text-sm font-semibold text-anthrazit leading-tight line-clamp-1">
                {nextAppointment.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(nextAppointment.scheduled_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ) : (
            <p className="text-lg font-semibold mt-1 text-muted-foreground">Keine</p>
          )}
        </Link>

        {/* Helfer */}
        <Link
          href="/care/helpers"
          className="rounded-xl border bg-card p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Helfer
          </div>
          {helperCount !== null ? (
            <p className="text-lg font-semibold mt-1 text-anthrazit">
              {helperCount} {helperCount === 1 ? 'verifiziert' : 'verifiziert'}
            </p>
          ) : (
            <p className="text-lg font-semibold mt-1 text-muted-foreground">—</p>
          )}
        </Link>
      </div>

      {/* Aktive SOS-Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Aktive SOS-Alarme</h2>
          {activeAlerts.slice(0, 3).map((alert) => (
            <Link key={alert.id} href={`/care/sos/${alert.id}`}>
              <SosAlertCard alert={alert} showActions={true} />
            </Link>
          ))}
          {activeAlerts.length > 3 && (
            <Link
              href="/care/sos"
              className="flex items-center gap-1 text-sm text-quartier-green font-medium"
            >
              Alle {activeAlerts.length} Alarme anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Schnellzugriff */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Schnellzugriff</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/care/sos"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-alert-amber" />
            SOS-Uebersicht
          </Link>
          <Link
            href="/care/checkins"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <Clock className="h-4 w-4 text-quartier-green" />
            Check-in-Verlauf
          </Link>
          <Link
            href="/care/medications"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <Pill className="h-4 w-4 text-quartier-green" />
            Medikamente
          </Link>
          <Link
            href="/care/appointments"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <CalendarDays className="h-4 w-4 text-quartier-green" />
            Termine
          </Link>
          <Link
            href="/care/helpers"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <Users className="h-4 w-4 text-quartier-green" />
            Helfer
          </Link>
          <Link
            href="/care/reports"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <FileText className="h-4 w-4 text-quartier-green" />
            Berichte
          </Link>
          <Link
            href="/care/subscription"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4 text-quartier-green" />
            Abo-Plan
          </Link>
          <Link
            href="/care/audit"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <ScrollText className="h-4 w-4 text-quartier-green" />
            Protokoll
          </Link>
          {isAdmin && (
            <Link
              href="/care/admin/overview"
              className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm font-medium text-anthrazit hover:bg-blue-50 flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Plattform-Uebersicht
            </Link>
          )}
        </div>
      </div>

      {/* Info-Hinweis */}
      <div className="rounded-xl bg-quartier-green/10 p-4 text-sm text-anthrazit">
        <p className="font-medium">Pflege-Modul aktiv</p>
        <p className="mt-1 text-muted-foreground">
          Pflege-Modul vollstaendig: SOS, Check-ins, Medikamente, Termine, Helfer, Berichte, Abo-Verwaltung und Aktivitaetsprotokoll.
        </p>
      </div>
    </div>
  );
}
