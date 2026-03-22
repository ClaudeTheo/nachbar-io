"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { AlertCard } from "@/components/AlertCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAlertsByQuarter, respondToAlert } from "@/lib/services";
import { useAuth } from "@/hooks/use-auth";
import { useQuarter } from "@/lib/quarters";
import { createNotification } from "@/lib/notifications";
import type { Alert } from "@/lib/supabase/types";

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentQuarter } = useQuarter();

  async function loadAlerts() {
    if (!currentQuarter) return;
    try {
      const data = await getAlertsByQuarter(currentQuarter.id);
      setAlerts(data);
    } catch {
      // Fehler still ignorieren — leere Liste bleibt
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!currentQuarter) return;
    loadAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuarter?.id]);

  async function handleHelp(alertId: string) {
    if (!user) return;

    // Hilfe-Antwort erstellen + Status aktualisieren (via Service)
    await respondToAlert(alertId, user.id);

    // Alert-Ersteller benachrichtigen
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      createNotification({
        userId: alert.user_id,
        type: "alert_response",
        title: "Hilfe ist unterwegs!",
        body: `${user.email?.split("@")[0] ?? "Ein Nachbar"} kommt Ihnen zu Hilfe.`,
        referenceId: alertId,
        referenceType: "alert",
      });
    }

    loadAlerts();
  }

  const openAlerts = alerts.filter((a) => a.status === "open");
  const activeAlerts = alerts.filter((a) => a.status === "help_coming");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  return (
    <div>
      <PageHeader
        title="Hilfeanfragen"
        subtitle="Nachbarn helfen Nachbarn"
        backHref="/dashboard"
        className="mb-4"
        actions={
          <Link
            href="/alerts/new"
            className="flex items-center gap-1 rounded-lg bg-alert-amber px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            Neue Anfrage
          </Link>
        }
      />

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
            <EmptyState text="Keine offenen Hilfeanfragen — alles in Ordnung!" icon="🎉" />
          )}
          {openAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onHelp={handleHelp} />
          ))}
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-3">
          {activeAlerts.length === 0 && !loading && (
            <EmptyState text="Keine aktiven Anfragen gerade." icon="🤝" />
          )}
          {activeAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {resolvedAlerts.length === 0 && !loading && (
            <EmptyState text="Noch keine erledigten Anfragen." icon="📋" />
          )}
          {resolvedAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text, icon }: { text: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="text-4xl">{icon ?? "✅"}</span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
