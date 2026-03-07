"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AlertCard } from "@/components/AlertCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { Alert } from "@/lib/supabase/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("alerts")
      .select("*, user:users(display_name, avatar_url), household:households(street_name, house_number, lat, lng), responses:alert_responses(*, responder:users(display_name, avatar_url))")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setAlerts(data as unknown as Alert[]);
    setLoading(false);
  }

  async function handleHelp(alertId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Hilfe-Antwort erstellen
    await supabase.from("alert_responses").insert({
      alert_id: alertId,
      responder_user_id: user.id,
      response_type: "help",
    });

    // Alert-Status aktualisieren
    await supabase.from("alerts").update({ status: "help_coming" }).eq("id", alertId);

    loadAlerts();
  }

  const openAlerts = alerts.filter((a) => a.status === "open");
  const activeAlerts = alerts.filter((a) => a.status === "help_coming");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Hilfeanfragen</h1>
        <Link
          href="/alerts/new"
          className="flex items-center gap-1 rounded-lg bg-alert-amber px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Neue Anfrage
        </Link>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="w-full">
          <TabsTrigger value="open" className="flex-1">
            Offen ({openAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1">
            Aktiv ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1">
            Erledigt ({resolvedAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-3">
          {openAlerts.length === 0 && !loading && (
            <EmptyState text="Keine offenen Hilfeanfragen." />
          )}
          {openAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onHelp={handleHelp} />
          ))}
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeAlerts.length === 0 && !loading && (
            <EmptyState text="Keine aktiven Anfragen." />
          )}
          {activeAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {resolvedAlerts.length === 0 && !loading && (
            <EmptyState text="Noch keine erledigten Anfragen." />
          )}
          {resolvedAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
