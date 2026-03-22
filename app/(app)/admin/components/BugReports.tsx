"use client";

// app/(app)/admin/components/BugReports.tsx
// Admin-Ansicht fuer Bug-Reports mit Freigabe-Workflow

import { useEffect, useState, useCallback } from "react";
import {
  Bug, Check, X, RefreshCw, ExternalLink, Clock,
  ChevronDown, ChevronUp, Eye, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { toast } from "sonner";

interface BugReport {
  id: string;
  user_id: string;
  quarter_id: string | null;
  page_url: string;
  page_title: string;
  screenshot_url: string | null;
  console_errors: unknown[] | null;
  browser_info: Record<string, unknown> | null;
  page_meta: Record<string, unknown> | null;
  user_comment: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  // Join
  user?: { display_name: string } | null;
}

type FilterStatus = "all" | "new" | "approved" | "rejected" | "seen" | "fixed" | "wont_fix";

export function BugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("new");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Aktuellen User ermitteln
    const { user } = await getCachedUser(supabase);
    if (user) setCurrentUserId(user.id);

    let query = supabase
      .from("bug_reports")
      .select("*, user:users(display_name)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Bug-Reports konnten nicht geladen werden");
      console.error("[BugReports]", error);
    }
    setReports((data as unknown as BugReport[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Status aendern
  async function updateStatus(id: string, newStatus: string) {
    const supabase = createClient();
    const notes = adminNotes[id]?.trim() || null;
    const { error } = await supabase
      .from("bug_reports")
      .update({
        status: newStatus,
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Status konnte nicht geändert werden");
      return;
    }
    const statusLabels: Record<string, string> = {
      approved: "bestätigt", rejected: "abgelehnt", seen: "als gesehen markiert",
      fixed: "als behoben markiert", wont_fix: "als 'kein Fix' markiert",
    };
    toast.success(`Bug-Report ${statusLabels[newStatus] || "aktualisiert"}`);
    loadReports();
  }

  // Loeschen
  async function deleteReport(id: string) {
    if (!confirm("Bug-Report wirklich löschen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("bug_reports").delete().eq("id", id);
    if (error) {
      toast.error("Löschen fehlgeschlagen");
      return;
    }
    toast.success("Bug-Report gelöscht");
    loadReports();
  }

  // Zaehler pro Status
  const counts = {
    new: reports.length, // Wird separat gezaehlt wenn filter=all
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "new": return <Badge variant="default" className="bg-alert-amber text-white">Neu</Badge>;
      case "approved": return <Badge variant="default" className="bg-quartier-green text-white">Bestätigt</Badge>;
      case "rejected": return <Badge variant="destructive">Abgelehnt</Badge>;
      case "seen": return <Badge variant="secondary">Gesehen</Badge>;
      case "fixed": return <Badge variant="default" className="bg-blue-500 text-white">Behoben</Badge>;
      case "wont_fix": return <Badge variant="outline">Kein Fix</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const extractPath = (url: string) => {
    try { return new URL(url).pathname; } catch { return url; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-anthrazit flex items-center gap-2">
          <Bug className="h-5 w-5 text-alert-amber" />
          Bug-Reports ({reports.length})
        </h2>
        <Button variant="ghost" size="sm" onClick={loadReports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filter-Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["new", "seen", "approved", "rejected", "fixed", "wont_fix", "all"] as FilterStatus[]).map((s) => {
          const labels: Record<FilterStatus, string> = {
            new: "Neu", seen: "Gesehen", approved: "Bestätigt", rejected: "Abgelehnt",
            fixed: "Behoben", wont_fix: "Kein Fix", all: "Alle",
          };
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-anthrazit text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Bug className="mx-auto h-8 w-8 mb-2 opacity-40" />
          <p>Keine Bug-Reports mit Status &quot;{filter === "all" ? "alle" : filter}&quot;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            const isOwnReport = report.user_id === currentUserId;

            return (
              <Card key={report.id} className={isOwnReport ? "border-l-4 border-l-quartier-green" : ""}>
                <CardContent className="p-4">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="flex w-full items-start justify-between text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(report.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(report.created_at)}
                        </span>
                        {isOwnReport && (
                          <span className="text-xs text-quartier-green font-medium">Eigener</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-anthrazit line-clamp-2">
                        {report.user_comment || "(Kein Kommentar)"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {extractPath(report.page_url)}
                        {report.user?.display_name && (
                          <span> · {report.user.display_name}</span>
                        )}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-3">
                      {/* Screenshot */}
                      {report.screenshot_url && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Screenshot</p>
                          <a
                            href={report.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-quartier-green hover:underline flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Screenshot öffnen
                          </a>
                        </div>
                      )}

                      {/* Console Errors */}
                      {report.console_errors && Array.isArray(report.console_errors) && report.console_errors.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Console-Fehler ({report.console_errors.length})
                          </p>
                          <div className="rounded-lg bg-muted/50 p-2 text-xs font-mono max-h-32 overflow-y-auto">
                            {report.console_errors.map((err, i) => (
                              <div key={i} className="text-red-600 mb-1 break-all">
                                {typeof err === "string" ? err : JSON.stringify(err)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Browser-Info */}
                      {report.browser_info && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Browser</p>
                          <p className="text-xs text-muted-foreground">
                            {String((report.browser_info as Record<string, unknown>).userAgent ?? "").slice(0, 100)}
                          </p>
                        </div>
                      )}

                      {/* Admin-Notizen */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Admin-Notizen</p>
                        <Textarea
                          value={adminNotes[report.id] ?? report.admin_notes ?? ""}
                          onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                          placeholder="Interne Notizen..."
                          className="min-h-[60px] text-sm"
                          maxLength={1000}
                        />
                      </div>

                      {/* Aktionen */}
                      <div className="flex gap-2 flex-wrap">
                        {report.status !== "approved" && (
                          <Button
                            size="sm"
                            className="bg-quartier-green hover:bg-quartier-green-dark"
                            onClick={() => updateStatus(report.id, "approved")}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Freigeben
                          </Button>
                        )}
                        {report.status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(report.id, "rejected")}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Ablehnen
                          </Button>
                        )}
                        {report.status === "new" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(report.id, "seen")}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Gesehen
                          </Button>
                        )}
                        {report.status !== "fixed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-300"
                            onClick={() => updateStatus(report.id, "fixed")}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Behoben
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteReport(report.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Löschen
                        </Button>
                      </div>

                      {/* Reviewed-Info */}
                      {report.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Zuletzt bearbeitet: {formatDate(report.reviewed_at)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
