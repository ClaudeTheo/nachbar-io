// app/(app)/care/page.tsx
// Gesundheit Hub — 6 große Kacheln (2-Spalten-Raster)
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Heart,
  CheckCircle2,
  Pill,
  Stethoscope,
  CalendarDays,
  Video,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { SosAlertCard } from "@/modules/care/components/sos/SosAlertCard";
import type { CareSosAlert, CareAppointment } from "@/lib/care/types";
import { PLAN_FEATURES } from "@/lib/care/constants";
import type { CareSubscriptionPlan } from "@/lib/care/types";
import { useAuth } from "@/hooks/use-auth";

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

export default function GesundheitHubPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(
    null,
  );
  const [activeAlerts, setActiveAlerts] = useState<CareSosAlert[]>([]);
  const [medicationStatus, setMedicationStatus] =
    useState<MedicationDueStatus | null>(null);
  const [nextAppointment, setNextAppointment] =
    useState<CareAppointment | null>(null);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);

  const hasFeature = (feature: string) => planFeatures.includes(feature);

  // Abo-Plan laden für Feature-Gating
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    async function loadPlan() {
      const { data: subscription } = await supabase
        .from("care_subscriptions")
        .select("plan, status")
        .eq("user_id", user!.id)
        .maybeSingle();
      const plan: CareSubscriptionPlan = subscription?.plan ?? "free";
      const isActive =
        !subscription ||
        subscription.status === "active" ||
        subscription.status === "trial";
      setPlanFeatures(isActive ? (PLAN_FEATURES[plan] ?? []) : []);
    }
    loadPlan();
  }, [user]);

  // Check-in Status laden
  useEffect(() => {
    async function loadCheckinStatus() {
      try {
        const res = await fetch("/api/care/checkin/status");
        if (res.ok) setCheckinStatus(await res.json());
      } catch {
        /* silent */
      }
    }
    loadCheckinStatus();
  }, []);

  // Aktive SOS-Alerts laden
  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch("/api/care/sos");
        if (res.ok) setActiveAlerts(await res.json());
      } catch {
        /* silent */
      }
      setLoading(false);
    }
    loadAlerts();

    // Realtime-Abonnement für sofortige Aktualisierungen
    const supabase = createClient();
    const channel = supabase
      .channel("care-hub-sos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "care_sos_alerts" },
        () => {
          loadAlerts();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fällige Medikamente laden
  useEffect(() => {
    if (!hasFeature("medications")) return;
    async function loadMedicationStatus() {
      try {
        const res = await fetch("/api/care/medications/due");
        if (res.ok) {
          const data: Array<{ status: string }> = await res.json();
          setMedicationStatus({
            pendingCount: data.filter((m) => m.status === "pending").length,
            completedCount: data.filter((m) => m.status === "taken").length,
          });
        }
      } catch {
        /* silent */
      }
    }
    loadMedicationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFeatures]);

  // Nächsten Termin laden
  useEffect(() => {
    if (!hasFeature("appointments")) return;
    async function loadNextAppointment() {
      try {
        const res = await fetch("/api/care/appointments?upcoming=true");
        if (res.ok) {
          const data: CareAppointment[] = await res.json();
          setNextAppointment(data[0] ?? null);
        }
      } catch {
        /* silent */
      }
    }
    loadNextAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFeatures]);

  if (loading || authLoading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[100px] bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Medikamenten-Subtitle berechnen
  const medSubtitle =
    medicationStatus && medicationStatus.pendingCount > 0
      ? `${medicationStatus.pendingCount} ausstehend`
      : medicationStatus
        ? "Alle eingenommen"
        : "Übersicht";

  // Termin-Subtitle berechnen
  const terminSubtitle = nextAppointment
    ? new Date(nextAppointment.scheduled_at).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Keine Termine";

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <>
            <Heart className="h-6 w-6 text-red-500" /> Gesundheit
          </>
        }
        subtitle="Ihr persönliches Gesundheits-Dashboard"
        backHref="/dashboard"
        backLabel="Zurück zum Dashboard"
      />

      {/* Aktive SOS-Alerts (wenn vorhanden) */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Aktive Hilfeanfragen
          </h2>
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
              Alle {activeAlerts.length} Alarme anzeigen{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* 6 Kacheln im 2-Spalten-Raster */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Check-in */}
        <Link
          href="/care/checkin"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-quartier-green" />
            <span className="font-semibold text-anthrazit">Check-in</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {checkinStatus?.allCompleted
              ? "Alle erledigt"
              : checkinStatus
                ? `${checkinStatus.completedCount}/${checkinStatus.totalCount} erledigt`
                : "Wie geht es Ihnen?"}
          </p>
        </Link>

        {/* 2. Medikamente */}
        <Link
          href="/care/medications"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-anthrazit">Medikamente</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{medSubtitle}</p>
        </Link>

        {/* 3. Ärzte */}
        <Link
          href="/care/aerzte"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-anthrazit">Ärzte</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">in der Nähe</p>
        </Link>

        {/* 4. Termine */}
        <Link
          href="/care/termine"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-violet-500" />
            <span className="font-semibold text-anthrazit">Termine</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {nextAppointment ? `Nächster: ${terminSubtitle}` : terminSubtitle}
          </p>
        </Link>

        {/* 5. Sprechstunde */}
        <Link
          href="/care/sprechstunde"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-anthrazit">Sprechstunde</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Video-Termin</p>
        </Link>

        {/* 6. Vorsorge */}
        <Link
          href="/praevention"
          className="bg-white rounded-xl border shadow-sm p-4 min-h-[100px] flex flex-col justify-between hover:bg-gray-50 transition-colors active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <span className="font-semibold text-anthrazit">Vorsorge</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Erinnerungen</p>
        </Link>
      </div>
    </div>
  );
}
