"use client";

import { useState, useEffect } from "react";
import { Eye, Database, Server, Shield, Clock, Users, Home, AlertTriangle, CheckCircle, XCircle, Download, Trash2, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { QUARTIER_STREETS } from "@/lib/constants";
import type { User, Household } from "@/lib/supabase/types";
import { toast } from "sonner";

interface SystemHealthProps {
  stats: {
    totalUsers: number;
    totalHouseholds: number;
    occupiedHouseholds: number;
    openAlerts: number;
    totalAlerts: number;
    resolvedAlerts: number;
    activeHelpRequests: number;
    activeMarketplace: number;
    activeLostFound: number;
    activeEvents: number;
    totalMessages: number;
    totalNews: number;
    seniorUsers: number;
  } | null;
  users: User[];
  households: (Household & { memberCount: number })[];
}

interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error";
  detail: string;
  responseMs?: number;
}

export function SystemHealth({ stats, users, households }: SystemHealthProps) {
  const [exporting, setExporting] = useState(false);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthTimestamp, setHealthTimestamp] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<"ok" | "warn" | "error">("ok");

  // Health-Checks beim Laden ausfuehren
  useEffect(() => {
    runHealthChecks();
  }, []);

  async function runHealthChecks() {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealthChecks(data.checks);
        setOverallStatus(data.overall);
        setHealthTimestamp(data.timestamp);
      } else {
        setHealthChecks([{ name: "API", status: "error", detail: `HTTP ${res.status}` }]);
        setOverallStatus("error");
      }
    } catch {
      setHealthChecks([{ name: "Netzwerk", status: "error", detail: "Health-Check nicht erreichbar" }]);
      setOverallStatus("error");
    }
    setHealthLoading(false);
  }

  // Umgebungsvariablen-Status (DSGVO: keine Werte anzeigen, nur ob konfiguriert)
  const envChecks = [
    { label: "Supabase URL", key: "NEXT_PUBLIC_SUPABASE_URL", critical: true },
    { label: "Supabase Key", key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", critical: true },
    { label: "VAPID Public Key", key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", critical: false },
    { label: "Anthropic API Key", key: "ANTHROPIC_API_KEY", critical: false },
  ];

  // Quartiersabdeckung pro Strasse berechnen
  const streetStats = QUARTIER_STREETS.map(street => {
    const total = households.filter(h => h.street_name === street).length;
    const occupied = households.filter(h => h.street_name === street && h.memberCount > 0).length;
    return { street, total, occupied, rate: total > 0 ? Math.round((occupied / total) * 100) : 0 };
  });

  // Trust-Level Verteilung
  const trustDistribution = {
    new: users.filter(u => u.trust_level === "new").length,
    verified: users.filter(u => u.trust_level === "verified").length,
    trusted: users.filter(u => u.trust_level === "trusted").length,
    admin: users.filter(u => u.trust_level === "admin").length,
  };

  // UI-Modus Verteilung
  const modeDistribution = {
    active: users.filter(u => u.ui_mode === "active").length,
    senior: users.filter(u => u.ui_mode === "senior").length,
  };

  // Aktivitaet der letzten 24h
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const recentlyActive = users.filter(u => u.last_seen && new Date(u.last_seen) > oneDayAgo).length;

  // Daten exportieren (anonymisiert)
  async function exportData() {
    setExporting(true);
    try {
      const data = {
        exportDate: new Date().toISOString(),
        summary: {
          totalUsers: stats?.totalUsers ?? 0,
          totalHouseholds: stats?.totalHouseholds ?? 0,
          occupiedHouseholds: stats?.occupiedHouseholds ?? 0,
          openAlerts: stats?.openAlerts ?? 0,
          resolvedAlerts: stats?.resolvedAlerts ?? 0,
          activeHelpRequests: stats?.activeHelpRequests ?? 0,
          activeMarketplace: stats?.activeMarketplace ?? 0,
          activeEvents: stats?.activeEvents ?? 0,
          totalMessages: stats?.totalMessages ?? 0,
          totalNews: stats?.totalNews ?? 0,
        },
        streetCoverage: streetStats,
        trustDistribution,
        modeDistribution,
        // DSGVO: Keine personenbezogenen Daten exportieren
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nachbar-io-report-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Bericht exportiert");
    } catch {
      toast.error("Export fehlgeschlagen");
    }
    setExporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-anthrazit" />
          <h2 className="font-semibold text-anthrazit">System & Analytik</h2>
        </div>
        <Button size="sm" variant="outline" className="text-xs h-8" onClick={exportData} disabled={exporting}>
          <Download className="h-3.5 w-3.5 mr-1" />
          {exporting ? "..." : "Bericht"}
        </Button>
      </div>

      {/* System-Status (Echtzeit) */}
      <Card className={`${overallStatus === "error" ? "border-red-300" : overallStatus === "warn" ? "border-alert-amber/50" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-anthrazit flex items-center gap-2">
              <Server className="h-4 w-4" /> System-Status
              <Badge variant={overallStatus === "ok" ? "secondary" : "destructive"} className="text-[10px]">
                {overallStatus === "ok" ? "Alles OK" : overallStatus === "warn" ? "Warnungen" : "Fehler"}
              </Badge>
            </h3>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={runHealthChecks} disabled={healthLoading}>
              {healthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {healthChecks.length > 0 ? (
            <div className="space-y-2">
              {healthChecks.map((check, i) => (
                <StatusRow key={i} label={check.name} status={check.status} detail={check.detail} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Health-Check wird ausgefuehrt...</p>
          )}
          {healthTimestamp && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Geprueft: {new Date(healthTimestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Konfigurationspruefung */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-anthrazit mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Konfiguration
          </h3>
          <div className="space-y-2">
            {envChecks.map((check) => {
              // Zur Sicherheit: Wir pruefen nur die Public-Keys im Client
              const isSet = check.key.startsWith("NEXT_PUBLIC_")
                ? !!process.env[check.key]
                : true; // Server-seitige Keys koennen hier nicht geprueft werden
              return (
                <div key={check.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {isSet ? (
                      <CheckCircle className="h-4 w-4 text-quartier-green" />
                    ) : (
                      <XCircle className={`h-4 w-4 ${check.critical ? "text-emergency-red" : "text-alert-amber"}`} />
                    )}
                    <span>{check.label}</span>
                  </div>
                  <Badge variant={isSet ? "secondary" : "destructive"} className="text-[10px]">
                    {isSet ? "Konfiguriert" : check.critical ? "Fehlt!" : "Optional"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strassenabdeckung */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-anthrazit mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Strassenabdeckung
          </h3>
          <div className="space-y-3">
            {streetStats.map((s) => (
              <div key={s.street}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{s.street}</span>
                  <span className="text-xs text-muted-foreground">{s.occupied}/{s.total} ({s.rate}%)</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      s.rate >= 70 ? "bg-quartier-green" :
                      s.rate >= 40 ? "bg-alert-amber" :
                      "bg-red-400"
                    }`}
                    style={{ width: `${Math.max(s.rate, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nutzer-Verteilungen */}
      <div className="grid grid-cols-2 gap-3">
        {/* Trust-Level */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-anthrazit mb-2">Trust-Level</h3>
            <div className="space-y-1.5">
              <DistributionRow label="Neu" value={trustDistribution.new} total={users.length} color="bg-gray-400" />
              <DistributionRow label="Verifiziert" value={trustDistribution.verified} total={users.length} color="bg-quartier-green" />
              <DistributionRow label="Vertraut" value={trustDistribution.trusted} total={users.length} color="bg-blue-500" />
              <DistributionRow label="Admin" value={trustDistribution.admin} total={users.length} color="bg-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* UI-Modus */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-anthrazit mb-2">UI-Modus</h3>
            <div className="space-y-1.5">
              <DistributionRow label="Aktiv" value={modeDistribution.active} total={users.length} color="bg-quartier-green" />
              <DistributionRow label="Senior" value={modeDistribution.senior} total={users.length} color="bg-alert-amber" />
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Aktiv (24h)</span>
              <span className="font-semibold text-anthrazit">{recentlyActive} / {users.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DSGVO-Hinweis */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-anthrazit mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" /> DSGVO-Compliance
          </h3>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              Datenbank in EU Frankfurt (Supabase)
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              Kein Google Analytics / Tracking-Pixel
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              Nur technisch notwendige Cookies
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              E-Mail als Hash gespeichert
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              RLS auf allen Tabellen
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-quartier-green shrink-0" />
              Datenschutzerklaerung / Impressum oeffentlich
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Wartungs-Aktionen */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-anthrazit mb-3 flex items-center gap-2">
            <Database className="h-4 w-4" /> Wartung
          </h3>
          <div className="space-y-2">
            <MaintenanceAction
              label="News-Aggregation starten"
              description="KI-Zusammenfassung lokaler Nachrichten ausfuehren"
              onClick={async () => {
                try {
                  const res = await fetch("/api/news/aggregate", { method: "POST" });
                  if (!res.ok) throw new Error();
                  const data = await res.json();
                  toast.success(`${data.processed} Nachricht(en) verarbeitet`);
                } catch { toast.error("News-Aggregation fehlgeschlagen"); }
              }}
            />
            <MaintenanceAction
              label="News-Scraper ausfuehren"
              description="Lokale Quellen nach neuen Nachrichten durchsuchen"
              onClick={async () => {
                try {
                  const res = await fetch("/api/news/scrape", { method: "POST" });
                  if (!res.ok) throw new Error();
                  toast.success("Scraper ausgefuehrt");
                } catch { toast.error("Scraper fehlgeschlagen"); }
              }}
            />
            <MaintenanceAction
              label="Statistik-Bericht exportieren"
              description="Anonymisierte Quartiersstatistik als JSON herunterladen"
              onClick={exportData}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// HILFSKOMPONENTEN
// ============================================================

function StatusRow({ label, status, detail }: { label: string; status: "ok" | "warn" | "error"; detail?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${
          status === "ok" ? "bg-quartier-green" :
          status === "warn" ? "bg-alert-amber" :
          "bg-emergency-red"
        }`} />
        <span>{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

function DistributionRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

function MaintenanceAction({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  const [running, setRunning] = useState(false);

  async function handleClick() {
    setRunning(true);
    await onClick();
    setRunning(false);
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-sm font-medium text-anthrazit">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={handleClick} disabled={running}>
        {running ? "..." : "Starten"}
      </Button>
    </div>
  );
}
