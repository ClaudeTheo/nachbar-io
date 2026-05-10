"use client";

// Welle K2 — Admin-UI fuer manuellen Re-Trigger der Amtsblatt-Pipeline.
// Listet die letzten Issues und bietet pro Issue einen "Reprocess"-Button,
// der existing announcements loescht und neu via KI extrahiert.
//
// Use-Cases:
// - Issue=error durch alten KI-Truncate-Bug -> mit robust-parse-Fix retten
// - Issue=done aber 0 announcements (Pilot-Reset hat sie geleert) -> restoren

import { useCallback, useEffect, useState } from "react";
import { CircleCheckBig, CircleX, Loader2, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface AmtsblattIssueRow {
  id: string;
  issue_number: string;
  issue_date: string;
  pdf_url: string;
  status: "pending" | "processing" | "done" | "error";
  extracted_count: number;
  error_message: string | null;
  created_at: string;
  announcements_count?: number;
}

export function AmtsblattReprocess() {
  const [issues, setIssues] = useState<AmtsblattIssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from("amtsblatt_issues")
        .select("id, issue_number, issue_date, pdf_url, status, extracted_count, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!rows || rows.length === 0) {
        setIssues([]);
        return;
      }

      // Pro Issue announcements zaehlen
      const enriched = await Promise.all(
        rows.map(async (r) => {
          const { count } = await supabase
            .from("municipal_announcements")
            .select("*", { count: "exact", head: true })
            .eq("amtsblatt_issue_id", r.id);
          return { ...r, announcements_count: count ?? 0 };
        }),
      );
      setIssues(enriched as AmtsblattIssueRow[]);
    } catch {
      toast.error("Issues konnten nicht geladen werden.");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  async function handleReprocess(issueId: string, issueNumber: string) {
    setReprocessing(issueId);
    try {
      const res = await fetch("/api/admin/amtsblatt/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`Fehler: ${err?.error ?? "Reprocess fehlgeschlagen"}`);
        return;
      }
      const data = (await res.json()) as {
        announcements_imported: number;
        status: string;
        error_message: string | null;
      };
      if (data.status === "done") {
        toast.success(
          `Ausgabe ${issueNumber}: ${data.announcements_imported} Meldungen importiert.`,
        );
      } else {
        toast.error(
          `Ausgabe ${issueNumber}: Reprocess-Fehler — ${data.error_message ?? "unbekannt"}`,
        );
      }
      await loadIssues();
    } catch {
      toast.error("Netzwerkfehler beim Reprocess.");
    } finally {
      setReprocessing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-quartier-green" />
        <h2 className="text-lg font-semibold text-anthrazit">
          Amtsblatt-Pipeline
        </h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Listet die letzten 20 Amtsblatt-Ausgaben mit Status und Anzahl der
        importierten Meldungen. &quot;Reprocess&quot; loescht existing
        Announcements der Ausgabe und extrahiert per KI neu — Idempotent.
        Kosten ~0.05 EUR pro Run.
      </p>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-anthrazit">
              {issues.length} Ausgaben
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadIssues}
              disabled={loading}
              aria-label="Issues neu laden"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Lade Issues...</p>
          ) : issues.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Keine Issues — Cron laeuft samstags 08:00 UTC.
            </p>
          ) : (
            <ul className="space-y-2">
              {issues.map((iss) => (
                <li
                  key={iss.id}
                  className="rounded-lg border border-border bg-white px-3 py-2 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {iss.status === "done" ? (
                        <CircleCheckBig className="h-4 w-4 text-quartier-green" />
                      ) : iss.status === "error" ? (
                        <CircleX className="h-4 w-4 text-red-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-anthrazit">
                        Ausgabe {iss.issue_number} ({iss.issue_date})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReprocess(iss.id, iss.issue_number)}
                      disabled={reprocessing !== null}
                    >
                      {reprocessing === iss.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      )}
                      Reprocess
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>
                      Status: <strong>{iss.status}</strong> · KI-Items:{" "}
                      {iss.extracted_count} · Announcements:{" "}
                      <strong
                        className={
                          (iss.announcements_count ?? 0) === 0 &&
                          iss.extracted_count > 0
                            ? "text-alert-amber"
                            : ""
                        }
                      >
                        {iss.announcements_count ?? 0}
                      </strong>
                    </div>
                    {iss.error_message ? (
                      <div className="text-red-500">{iss.error_message.slice(0, 200)}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
