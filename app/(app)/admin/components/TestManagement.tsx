"use client";

// app/(app)/admin/components/TestManagement.tsx
// Nachbar.io — Admin-Tab fuer Test-Management
// Uebersicht aller Tester, Fortschritt, Fehler, Filter, Export

import { useEffect, useState, useCallback } from "react";
import {
  Users, BarChart3, Download, Search,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Circle, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTestPointById } from "@/lib/testing/test-config";

// ============================================================
// Typen
// ============================================================

interface TesterRow {
  user_id: string;
  display_name: string;
  session_id: string | null;
  session_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  test_run_label: string | null;
  total: number;
  passed: number;
  partial: number;
  failed: number;
  skipped: number;
  open: number;
  progressPercent: number;
  usability_rating: number | null;
  confidence_rating: number | null;
  total_sessions: number;
}

interface AdminStats {
  totalTesters: number;
  activeTesters: number;
  completedTesters: number;
  avgProgress: number;
  topFailedPoints: { pointId: string; count: number }[];
  severityCounts: Record<string, number>;
  issueTypeCounts: Record<string, number>;
}

interface AdminData {
  testers: TesterRow[];
  stats: AdminStats;
}

// ============================================================
// Hauptkomponente
// ============================================================

export function TestManagement() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedTester, setExpandedTester] = useState<string | null>(null);
  const [testerResults, setTesterResults] = useState<Record<string, unknown[]>>({});

  // Daten laden
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/testing/admin");
      if (!res.ok) throw new Error("Daten konnten nicht geladen werden");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Detail-Ergebnisse fuer einen Tester laden
  const loadTesterDetails = async (sessionId: string) => {
    if (testerResults[sessionId]) return;
    try {
      const res = await fetch(`/api/testing/report?session_id=${sessionId}`);
      if (res.ok) {
        const json = await res.json();
        setTesterResults(prev => ({ ...prev, [sessionId]: json.paths ?? [] }));
      }
    } catch { /* ignorieren */ }
  };

  // CSV-Export
  const handleExport = async () => {
    try {
      const res = await fetch("/api/testing/admin?format=csv");
      if (!res.ok) throw new Error("Export fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[TestManagement] Export fehlgeschlagen:", err);
    }
  };

  // Filter anwenden
  const filteredTesters = data?.testers.filter(t => {
    if (searchTerm && !t.display_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== "all" && t.session_status !== statusFilter) return false;
    return true;
  }) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Lade Test-Daten...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
        {error}
        <Button variant="outline" size="sm" onClick={loadData} className="ml-3">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Uebersichts-Karten */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Tester gesamt" value={data.stats.totalTesters} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Ø Fortschritt" value={`${data.stats.avgProgress}%`} color="text-quartier-green" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Abgeschlossen" value={data.stats.completedTesters} />
        <StatCard icon={<Circle className="h-4 w-4 text-blue-500" />} label="Aktiv" value={data.stats.activeTesters} />
      </div>

      {/* Haeufigste Fehler */}
      {data.stats.topFailedPoints.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-anthrazit">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Haeufigste Fehler
            </h3>
            <div className="space-y-1.5">
              {data.stats.topFailedPoints.slice(0, 5).map(fp => {
                const point = getTestPointById(fp.pointId);
                return (
                  <div key={fp.pointId} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-red-600">{fp.pointId}</span>
                      <span className="text-xs text-anthrazit">{point?.title ?? fp.pointId}</span>
                    </div>
                    <span className="text-xs font-medium text-red-600">{fp.count}x</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Severity-Verteilung */}
      {Object.values(data.stats.severityCounts).some(v => v > 0) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-semibold text-anthrazit">Fehler nach Schweregrad</h3>
            <div className="flex gap-2">
              {(["critical", "high", "medium", "low"] as const).map(sev => {
                const count = data.stats.severityCounts[sev] ?? 0;
                const colors: Record<string, string> = {
                  critical: "bg-red-100 text-red-700",
                  high: "bg-orange-100 text-orange-700",
                  medium: "bg-amber-100 text-amber-700",
                  low: "bg-blue-100 text-blue-700",
                };
                return (
                  <span key={sev} className={`rounded px-2 py-1 text-xs font-medium ${colors[sev]}`}>
                    {sev}: {count}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter + Suche */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tester suchen..."
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm focus:border-quartier-green focus:outline-none"
        >
          <option value="all">Alle</option>
          <option value="active">Aktiv</option>
          <option value="completed">Abgeschlossen</option>
          <option value="abandoned">Abgebrochen</option>
        </select>
        <Button variant="outline" size="sm" onClick={handleExport} title="CSV exportieren">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={loadData} title="Aktualisieren">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tester-Tabelle */}
      <div className="space-y-1">
        {filteredTesters.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {data.stats.totalTesters === 0 ? "Noch keine Tester registriert" : "Keine Tester gefunden"}
          </div>
        ) : (
          filteredTesters.map(tester => (
            <TesterRow
              key={tester.user_id}
              tester={tester}
              isExpanded={expandedTester === tester.user_id}
              onToggle={() => {
                const newExpanded = expandedTester === tester.user_id ? null : tester.user_id;
                setExpandedTester(newExpanded);
                if (newExpanded && tester.session_id) {
                  loadTesterDetails(tester.session_id);
                }
              }}
              pathResults={tester.session_id ? (testerResults[tester.session_id] as PathResult[] | undefined) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// Hilfskomponenten
// ============================================================

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
        <p className={`mt-1 text-xl font-bold ${color ?? "text-anthrazit"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface PathResult {
  pathId: string;
  pathName: string;
  total: number;
  passed: number;
  partial: number;
  failed: number;
  skipped: number;
  open: number;
  progressPercent: number;
  failedPoints: { id: string; comment: string | null; severity: string | null; issue_type: string | null }[];
}

function TesterRow({
  tester,
  isExpanded,
  onToggle,
  pathResults,
}: {
  tester: TesterRow;
  isExpanded: boolean;
  onToggle: () => void;
  pathResults?: PathResult[];
}) {
  const statusColors: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    abandoned: "bg-gray-100 text-gray-600",
  };

  return (
    <Card className={isExpanded ? "ring-1 ring-quartier-green/30" : ""}>
      <CardContent className="p-0">
        <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50">
          {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-anthrazit truncate">{tester.display_name}</span>
              {tester.session_status && (
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[tester.session_status] ?? "bg-gray-100"}`}>
                  {tester.session_status === "active" ? "Aktiv" : tester.session_status === "completed" ? "Fertig" : "Abgebr."}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-quartier-green transition-all" style={{ width: `${tester.progressPercent}%` }} />
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{tester.progressPercent}%</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex gap-1.5 text-[10px]">
              <span className="text-emerald-600">✓{tester.passed}</span>
              <span className="text-amber-600">◐{tester.partial}</span>
              <span className="text-red-600">✗{tester.failed}</span>
            </div>
          </div>
        </button>

        {/* Expandierter Detail-Bereich */}
        {isExpanded && (
          <div className="border-t px-3 pb-3 pt-2">
            {/* Session-Info */}
            <div className="mb-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {tester.started_at && (
                <span>Start: {new Date(tester.started_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {tester.completed_at && (
                <span>Ende: {new Date(tester.completed_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {tester.usability_rating && <span>Usability: {"⭐".repeat(tester.usability_rating)}</span>}
              {tester.confidence_rating && <span>Vertrauen: {"⭐".repeat(tester.confidence_rating)}</span>}
            </div>

            {/* Pfad-Ergebnisse */}
            {pathResults ? (
              <div className="space-y-1.5">
                {pathResults.map((pr: PathResult) => (
                  <div key={pr.pathId}>
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5">
                      <span className="text-xs font-medium text-anthrazit">{pr.pathName}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-emerald-600">✓{pr.passed}</span>
                        <span className="text-red-600">✗{pr.failed}</span>
                        <span className="text-muted-foreground">{pr.progressPercent}%</span>
                      </div>
                    </div>
                    {/* Fehlgeschlagene Punkte */}
                    {pr.failedPoints.length > 0 && (
                      <div className="ml-3 mt-1 space-y-1">
                        {pr.failedPoints.map(fp => {
                          const point = getTestPointById(fp.id);
                          return (
                            <div key={fp.id} className="rounded border-l-2 border-red-300 bg-red-50/50 px-2 py-1">
                              <div className="flex items-center gap-1.5">
                                <XCircle className="h-3 w-3 text-red-500" />
                                <span className="text-[10px] font-mono text-red-600">{fp.id}</span>
                                <span className="text-[11px] text-anthrazit">{point?.title ?? fp.id}</span>
                                {fp.severity && (
                                  <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                                    fp.severity === "critical" ? "bg-red-100 text-red-700" :
                                    fp.severity === "high" ? "bg-orange-100 text-orange-700" :
                                    fp.severity === "medium" ? "bg-amber-100 text-amber-700" :
                                    "bg-blue-100 text-blue-700"
                                  }`}>{fp.severity}</span>
                                )}
                              </div>
                              {fp.comment && (
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{fp.comment}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-muted-foreground">
                {tester.session_id ? "Lade Details..." : "Keine Session gestartet"}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
