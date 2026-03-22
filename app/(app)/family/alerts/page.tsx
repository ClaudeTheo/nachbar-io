"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import dynamic from "next/dynamic";
import { AlertCard } from "@/components/AlertCard";
import { createClient } from "@/lib/supabase/client";
import { respondToAlert } from "@/lib/services";
import { useAuth } from '@/hooks/use-auth';
import type { Alert } from "@/lib/supabase/types";

const FamilyAlertMap = dynamic(() => import("@/components/alerts/FamilyAlertMap"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted" />,
});

interface FamilyAlert extends Alert {
  location?: { lat: number; lng: number; exact: boolean; source: string } | null;
}

export default function FamilyAlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FamilyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLinkedResidents, setHasLinkedResidents] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
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
    if (!user) return;

    // Hilfe-Antwort erstellen + Status aktualisieren (via Service)
    await respondToAlert(alertId, user.id);
    window.location.reload();
  }

  const alertsWithGps = alerts.filter((a) => a.location?.lat && a.location?.lng);

  return (
    <div>
      <PageHeader
        title="Meine Familie"
        subtitle="Hilferufe Ihrer Angehörigen"
        backHref="/dashboard"
        className="mb-6"
      />

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
