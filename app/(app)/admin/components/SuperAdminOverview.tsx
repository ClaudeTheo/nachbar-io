"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Users, Home, TriangleAlert, HandHelping,
  RefreshCw, MapPin, Clock, ArrowRight, Plus, Eye,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuarterWithStats, QuarterStatus } from "@/lib/quarters/types";

// -------------------------------------------------------------------
// Typen
// -------------------------------------------------------------------
interface SuperAdminOverviewProps {
  onOpenWizard: () => void;
  onSwitchTab: (tab: string) => void;
}

// -------------------------------------------------------------------
// Hilfsfunktionen
// -------------------------------------------------------------------
function statusLabel(status: QuarterStatus): string {
  switch (status) {
    case "active": return "Aktiv";
    case "draft": return "Entwurf";
    case "archived": return "Archiviert";
    default: return status;
  }
}

function statusVariant(status: QuarterStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "active": return "default";
    case "draft": return "secondary";
    case "archived": return "outline";
    default: return "outline";
  }
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -------------------------------------------------------------------
// Hauptkomponente
// -------------------------------------------------------------------
export function SuperAdminOverview({ onOpenWizard, onSwitchTab }: SuperAdminOverviewProps) {
  const [quarters, setQuarters] = useState<QuarterWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/quarters");
      if (!res.ok) {
        throw new Error(`Fehler ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setQuarters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregierte Statistiken
  const totalQuarters = quarters.length;
  const activeQuarters = quarters.filter((q) => q.status === "active").length;
  const draftQuarters = quarters.filter((q) => q.status === "draft").length;
  const archivedQuarters = quarters.filter((q) => q.status === "archived").length;

  const totalUsers = quarters.reduce((sum, q) => sum + (q.stats?.residentCount ?? 0), 0);
  const totalHelpRequests = quarters.reduce((sum, q) => sum + (q.stats?.helpRequests ?? 0), 0);
  const totalAlerts = quarters.reduce((sum, q) => sum + (q.stats?.activeAlerts ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Quartiersdaten werden geladen...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <TriangleAlert className="h-5 w-5" />
            <span className="font-medium">Fehler beim Laden der Daten</span>
          </div>
          <p className="mt-1 text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Erneut versuchen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-quartier-green" />
          <h2 className="text-lg font-semibold text-anthrazit">Plattform-Uebersicht</h2>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Top-Stats (4 Karten) */}
      <div className="grid grid-cols-2 gap-3">
        <TopStatCard
          icon={<Globe className="h-5 w-5 text-quartier-green" />}
          label="Quartiere gesamt"
          value={totalQuarters}
          detail={`${activeQuarters} aktiv / ${draftQuarters} Entwurf / ${archivedQuarters} archiviert`}
        />
        <TopStatCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="Nutzer gesamt"
          value={totalUsers}
          detail="Ueber alle Quartiere"
        />
        <TopStatCard
          icon={<HandHelping className="h-5 w-5 text-purple-500" />}
          label="Offene Hilfegesuche"
          value={totalHelpRequests}
          highlight={totalHelpRequests > 0}
        />
        <TopStatCard
          icon={<TriangleAlert className="h-5 w-5 text-alert-amber" />}
          label="Aktive Alerts"
          value={totalAlerts}
          highlight={totalAlerts > 0}
        />
      </div>

      {/* Quartiers-Karten */}
      <div>
        <h3 className="text-sm font-semibold text-anthrazit mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Quartiere im Detail
        </h3>
        {quarters.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Noch keine Quartiere vorhanden.
              </p>
              <Button variant="default" size="sm" className="mt-3" onClick={onOpenWizard}>
                <Plus className="h-4 w-4 mr-1" /> Erstes Quartier anlegen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quarters.map((q) => (
              <QuarterMiniCard
                key={q.id}
                quarter={q}
                onManage={() => onSwitchTab("quarters")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Schnellaktionen */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="default"
          className="h-auto py-3 flex flex-col items-center gap-1 bg-quartier-green hover:bg-quartier-green/90"
          onClick={onOpenWizard}
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-medium">Neues Quartier anlegen</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1"
          onClick={() => onSwitchTab("system")}
        >
          <Eye className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">System-Health pruefen</span>
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Hilfskomponenten
// -------------------------------------------------------------------

function TopStatCard({
  icon,
  label,
  value,
  detail,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-alert-amber/50 bg-alert-amber/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`mt-1 text-2xl font-bold ${highlight ? "text-alert-amber" : "text-anthrazit"}`}>
          {value}
        </p>
        {detail && (
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function QuarterMiniCard({
  quarter,
  onManage,
}: {
  quarter: QuarterWithStats;
  onManage: () => void;
}) {
  const stats = quarter.stats ?? {
    householdCount: 0,
    residentCount: 0,
    activeAlerts: 0,
    helpRequests: 0,
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Kopfzeile: Name + Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-quartier-green shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-anthrazit text-sm truncate">
                {quarter.name}
              </p>
              {quarter.city && (
                <p className="text-xs text-muted-foreground truncate">
                  {quarter.city}
                  {quarter.state ? `, ${quarter.state}` : ""}
                </p>
              )}
            </div>
          </div>
          <Badge variant={statusVariant(quarter.status)} className="shrink-0 text-xs">
            {statusLabel(quarter.status)}
          </Badge>
        </div>

        {/* Metriken */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <MetricItem
            icon={<Users className="h-3.5 w-3.5" />}
            label="Bewohner"
            value={stats.residentCount}
          />
          <MetricItem
            icon={<Home className="h-3.5 w-3.5" />}
            label="Haushalte"
            value={stats.householdCount}
          />
          <MetricItem
            icon={<TriangleAlert className="h-3.5 w-3.5" />}
            label="Alerts"
            value={stats.activeAlerts}
            highlight={stats.activeAlerts > 0}
          />
          <MetricItem
            icon={<HandHelping className="h-3.5 w-3.5" />}
            label="Hilfe"
            value={stats.helpRequests}
          />
        </div>

        {/* Fusszeile: Letzte Aenderung + Verwalten-Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(quarter.updated_at)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-quartier-green hover:text-quartier-green/80"
            onClick={onManage}
          >
            Verwalten <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={highlight ? "text-alert-amber" : "text-muted-foreground"}>
        {icon}
      </div>
      <span className={`text-sm font-semibold ${highlight ? "text-alert-amber" : "text-anthrazit"}`}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
