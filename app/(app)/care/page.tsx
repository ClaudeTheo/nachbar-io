// app/(app)/care/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Heart, AlertTriangle, Clock, ArrowRight, Pill, CalendarDays, Users, FileText, CreditCard, ScrollText, BarChart3, UserCog, Shield } from 'lucide-react';
import Link from 'next/link';
import { SosButton } from '@/components/care/SosButton';
import { CareConsentGate } from '@/components/care/CareConsentGate';
import { SosAlertCard } from '@/components/care/SosAlertCard';
import type { CareSosAlert, CareAppointment, CareSubscriptionPlan, CareHelperRole } from '@/lib/care/types';
import { PLAN_FEATURES } from '@/lib/care/constants';

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
  const [_userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<CareSosAlert[]>([]);
  const [medicationStatus, setMedicationStatus] = useState<MedicationDueStatus | null>(null);
  const [nextAppointment, setNextAppointment] = useState<CareAppointment | null>(null);
  const [helperCount, setHelperCount] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [helperRole, setHelperRole] = useState<CareHelperRole | null>(null);
  const [isVerifiedHelper, setIsVerifiedHelper] = useState(false);
  const [trustLevel, setTrustLevel] = useState<string>('verified');

  // Feature-Pruefung: Ist ein Feature im aktuellen Plan verfuegbar?
  const hasFeature = (feature: string) => planFeatures.includes(feature);

  // Aktuellen Nutzer laden + Admin-Check + Plan-Features laden
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (user) {
        const { data } = await supabase.from('users').select('is_admin, trust_level').eq('id', user.id).single();
        setIsAdmin(data?.is_admin === true);
        setTrustLevel(data?.trust_level ?? 'verified');

        // Abo-Plan laden fuer Feature-Gating
        const { data: subscription } = await supabase
          .from('care_subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .maybeSingle();
        const plan: CareSubscriptionPlan = subscription?.plan ?? 'free';
        const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trial';
        setPlanFeatures(isActive ? (PLAN_FEATURES[plan] ?? []) : []);
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

  // Faellige Medikamente laden (nur wenn Feature verfuegbar)
  useEffect(() => {
    if (!hasFeature('medications')) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFeatures]);

  // Naechsten Termin laden (nur wenn Feature verfuegbar)
  useEffect(() => {
    if (!hasFeature('appointments')) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFeatures]);

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

  // Eigenen Helfer-Status laden (fuer "Meine Senioren" Link)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: helper } = await supabase
        .from('care_helpers')
        .select('role, verification_status, assigned_seniors')
        .eq('user_id', user.id)
        .maybeSingle();
      if (helper) {
        setHelperRole(helper.role as CareHelperRole);
        setIsVerifiedHelper(
          helper.verification_status === 'verified' &&
          (helper.assigned_seniors?.length ?? 0) > 0
        );
      }
    });
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
    <CareConsentGate>
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Heart className="h-6 w-6 text-quartier-green" />
          Pflege & Seniorenhilfe
        </h1>
        <p className="text-muted-foreground mt-1">Ihr persoenliches Pflege-Dashboard</p>
      </div>

      {/* Verifikations-Hinweis fuer neue Nutzer */}
      {trustLevel === 'new' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Ihre Adresse muss noch bestaetigt werden.
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Bitten Sie zwei Nachbarn um Bestaetigung, damit Sie alle Funktionen nutzen koennen.
          </p>
          <Link
            href="/vouching"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-800 hover:text-amber-900"
          >
            Zur Verifikation
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* SOS-Button (kompakt) */}
      <SosButton compact />

      {/* Status-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Check-in Status */}
        <Link
          href="/care/checkin"
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
            Hilfeanfragen
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

        {/* Medikamente (Feature-Gate: medications) */}
        {hasFeature('medications') && (
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
        )}

        {/* Termine (Feature-Gate: appointments) */}
        {hasFeature('appointments') && (
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
        )}

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
          <h2 className="text-sm font-medium text-muted-foreground">Aktive Hilfeanfragen</h2>
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
            href="/care/checkin"
            className="rounded-lg border-2 border-quartier-green bg-quartier-green/5 p-3 text-sm font-medium text-anthrazit hover:bg-quartier-green/10 flex items-center gap-2"
          >
            <Clock className="h-4 w-4 text-quartier-green" />
            Jetzt einchecken
          </Link>
          {/* Meine Senioren (nur fuer verifizierte Angehoerige/Pflegedienst) */}
          {isVerifiedHelper && (helperRole === 'relative' || helperRole === 'care_service') && (
            <Link
              href="/care/meine-senioren"
              className="rounded-lg border-2 border-quartier-green bg-quartier-green/5 p-3 text-sm font-medium text-anthrazit hover:bg-quartier-green/10 flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-quartier-green" />
              Meine Senioren
            </Link>
          )}
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
            <Clock className="h-4 w-4 text-muted-foreground" />
            Check-in-Verlauf
          </Link>
          {hasFeature('medications') && (
            <Link
              href="/care/medications"
              className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
            >
              <Pill className="h-4 w-4 text-quartier-green" />
              Medikamente
            </Link>
          )}
          {hasFeature('appointments') && (
            <Link
              href="/care/appointments"
              className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4 text-quartier-green" />
              Termine
            </Link>
          )}
          <Link
            href="/care/helpers"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <Users className="h-4 w-4 text-quartier-green" />
            Helfer
          </Link>
          <Link
            href="/care/shopping"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="text-base" aria-hidden="true">🛒</span>
            Einkaufshilfe
          </Link>
          <Link
            href="/care/tasks"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <span className="text-base" aria-hidden="true">📋</span>
            Aufgabentafel
          </Link>
          {hasFeature('reports') && (
            <Link
              href="/care/reports"
              className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-quartier-green" />
              Berichte
            </Link>
          )}
          <Link
            href="/care/profile"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <UserCog className="h-4 w-4 text-quartier-green" />
            Profil
          </Link>
          <Link
            href="/care/consent"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <Shield className="h-4 w-4 text-quartier-green" />
            Einwilligungen
          </Link>
          <Link
            href="/care/subscription"
            className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4 text-quartier-green" />
            Abo-Plan
          </Link>
          {hasFeature('audit_log') && (
            <Link
              href="/care/audit"
              className="rounded-lg border bg-card p-3 text-sm font-medium text-anthrazit hover:bg-gray-50 flex items-center gap-2"
            >
              <ScrollText className="h-4 w-4 text-quartier-green" />
              Protokoll
            </Link>
          )}
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
    </CareConsentGate>
  );
}
