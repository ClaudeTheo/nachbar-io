"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertCard } from "@/components/AlertCard";
import { createClient } from "@/lib/supabase/client";
import type { Alert } from "@/lib/supabase/types";

const FamilyAlertMap = dynamic(() => import("@/components/alerts/FamilyAlertMap"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

interface FamilyAlert extends Alert {
  location?: { lat: number; lng: number; exact: boolean; source: string } | null;
}

export default function FamilyAlertsPage() {
  const [alerts, setAlerts] = useState<FamilyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLinkedResidents, setHasLinkedResidents] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Verlinkte Bewohner laden
      const { data: links } = await supabase
        .from("caregiver_links")
        .select("resident_id")
        .eq("caregiver_id", user.id)
        .is("revoked_at", null);

      if (!links || links.length === 0) {
        setLoading(false);
        return;
      }

      setHasLinkedResidents(true);
      const residentIds = links.map((l) => l.resident_id);

      // Alerts der Familienmitglieder laden
      const { data: alertData } = await supabase
        .from("alerts")
        .select("*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng)")
        .in("user_id", residentIds)
        .in("status", ["open", "help_coming"])
        .order("created_at", { ascending: false });

      if (alertData) {
        // Location fuer jeden Alert laden
        const alertsWithLocation: FamilyAlert[] = await Promise.all(
          (alertData as FamilyAlert[]).map(async (alert) => {
            try {
              const res = await fetch(`/api/alerts/${alert.id}/location`);
              if (res.ok) {
                const { location } = await res.json();
                return { ...alert, location };
              }
              return { ...alert, location: null };
            } catch {
              return { ...alert, location: null };
            }
          }),
        );
        setAlerts(alertsWithLocation);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleHelp(alertId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("alert_responses").insert({
      alert_id: alertId,
      responder_user_id: user.id,
      response_type: "help",
    });

    await supabase.from("alerts").update({ status: "help_coming" }).eq("id", alertId);
    window.location.reload();
  }

  const alertsWithGps = alerts.filter((a) => a.location?.lat && a.location?.lng);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-anthrazit">Meine Familie</h1>
          <p className="text-sm text-muted-foreground">Hilferufe Ihrer Angehörigen</p>
        </div>
      </div>

      {/* Karte mit Familien-Alerts */}
      {alertsWithGps.length > 0 && (
        <div className="mb-4 h-64 overflow-hidden rounded-xl border">
          <FamilyAlertMap
            alerts={alertsWithGps.map((a) => ({
              id: a.id,
              title: a.title,
              category: a.category,
              status: a.status,
              location: a.location!,
            }))}
            onHelp={handleHelp}
          />
        </div>
      )}

      {/* Alert-Liste */}
      <div className="space-y-3">
        {loading && <p className="py-8 text-center text-muted-foreground">Laden...</p>}

        {!loading && alerts.length === 0 && (
          <div className="py-12 text-center">
            <span className="text-4xl">&#x2705;</span>
            <p className="mt-2 text-muted-foreground">
              {!hasLinkedResidents
                ? "Sie haben noch keine Familienmitglieder verknüpft."
                : "Keine aktiven Hilferufe — alles in Ordnung!"}
            </p>
          </div>
        )}

        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onHelp={alert.status === "open" ? handleHelp : undefined} />
        ))}
      </div>
    </div>
  );
}
