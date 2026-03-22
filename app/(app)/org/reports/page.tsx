// app/(app)/org/reports/page.tsx
// Nachbar.io — Maengelmelder-Moderation fuer Org-Admins (Pro Community)
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { toast } from "sonner";
import type { MunicipalReport, ReportStatus } from "@/lib/municipal";
import { REPORT_CATEGORIES, REPORT_STATUS_CONFIG } from "@/lib/municipal";

// Alle Status-Optionen fuer den Filter
const STATUS_FILTERS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "open", label: "Offen" },
  { value: "acknowledged", label: "Gesehen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "resolved", label: "Erledigt" },
];

export default function OrgReportsPage() {
  const [reports, setReports] = useState<MunicipalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [assignedQuarters, setAssignedQuarters] = useState<string[]>([]);
  // Status-Notizen pro Meldung
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
  // Lade-Zustand pro Meldung (fuer Button-Deaktivierung)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  // Meldungen laden
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Aktuellen Nutzer holen
      const { user } = await getCachedUser(supabase);
      if (!user) {
        setError("Nicht angemeldet.");
        return;
      }
      setUserId(user.id);

      // Org-Mitgliedschaft pruefen (nur Admins)
      const { data: membership, error: memberError } = await supabase
        .from("org_members")
        .select("org_id, assigned_quarters")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (memberError || !membership) {
        setError("Keine Admin-Berechtigung gefunden.");
        return;
      }

      setOrgId(membership.org_id);
      setAssignedQuarters(membership.assigned_quarters || []);

      if (!membership.assigned_quarters?.length) {
        setReports([]);
        return;
      }

      // Meldungen fuer zugewiesene Quartiere laden
      const { data, error: reportsError } = await supabase
        .from("municipal_reports")
        .select("*")
        .in("quarter_id", membership.assigned_quarters)
        .order("created_at", { ascending: false });

      if (reportsError) {
        setError("Meldungen konnten nicht geladen werden.");
        return;
      }

      setReports(data || []);
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es später erneut.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Status einer Meldung aendern
  async function handleStatusChange(report: MunicipalReport, newStatus: ReportStatus) {
    if (!orgId || !userId) return;
    if (newStatus === report.status) return;

    setActionLoading((prev) => ({ ...prev, [report.id]: true }));

    try {
      const note = statusNotes[report.id]?.trim() || null;
      const now = new Date().toISOString();

      // Meldung aktualisieren
      const { error: updateError } = await supabase
        .from("municipal_reports")
        .update({
          status: newStatus,
          status_note: note,
          updated_at: now,
          ...(newStatus === "resolved" ? { resolved_at: now } : {}),
        })
        .eq("id", report.id);

      if (updateError) {
        toast.error("Status konnte nicht geändert werden.");
        return;
      }

      // Audit-Log schreiben
      await supabase.from("org_audit_log").insert({
        org_id: orgId,
        user_id: userId,
        action: "report_status_changed",
        target_user_id: report.user_id,
        details: {
          report_id: report.id,
          old_status: report.status,
          new_status: newStatus,
          note,
        },
      });

      // Lokalen State aktualisieren
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                status: newStatus,
                status_note: note,
                updated_at: now,
                ...(newStatus === "resolved" ? { resolved_at: now } : {}),
              }
            : r,
        ),
      );

      // Notiz-Feld leeren
      setStatusNotes((prev) => ({ ...prev, [report.id]: "" }));

      const statusLabel = REPORT_STATUS_CONFIG.find((s) => s.id === newStatus)?.label || newStatus;
      toast.success(`Status geändert: ${statusLabel}`);
    } catch {
      toast.error("Fehler beim Ändern des Status.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [report.id]: false }));
    }
  }

  // Meldung loeschen
  async function handleDelete(report: MunicipalReport) {
    if (!orgId || !userId) return;

    // Bestaetigung einholen
    const confirmed = window.confirm(
      `Möchten Sie diese Meldung wirklich löschen?\n\n„${report.description || "Keine Beschreibung"}"`,
    );
    if (!confirmed) return;

    setActionLoading((prev) => ({ ...prev, [report.id]: true }));

    try {
      // Meldung loeschen
      const { error: deleteError } = await supabase
        .from("municipal_reports")
        .delete()
        .eq("id", report.id);

      if (deleteError) {
        toast.error("Meldung konnte nicht gelöscht werden.");
        return;
      }

      // Audit-Log schreiben
      await supabase.from("org_audit_log").insert({
        org_id: orgId,
        user_id: userId,
        action: "report_deleted",
        target_user_id: report.user_id,
        details: {
          report_id: report.id,
          category: report.category,
          description: report.description,
        },
      });

      // Aus lokalem State entfernen
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success("Meldung gelöscht.");
    } catch {
      toast.error("Fehler beim Löschen der Meldung.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [report.id]: false }));
    }
  }

  // Gefilterte Meldungen
  const filteredReports =
    statusFilter === "all" ? reports : reports.filter((r) => r.status === statusFilter);

  // Kategorie-Info finden
  function getCategoryInfo(categoryId: string) {
    return REPORT_CATEGORIES.find((c) => c.id === categoryId);
  }

  // Status-Info finden
  function getStatusInfo(statusId: string) {
    return REPORT_STATUS_CONFIG.find((s) => s.id === statusId);
  }

  // Datum formatieren
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // --- Ladezustand ---
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#4CAF87]" />
      </div>
    );
  }

  // --- Fehlerzustand ---
  if (error) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  // --- Keine zugewiesenen Quartiere ---
  if (assignedQuarters.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm">
        <p className="text-gray-600">Keine Quartiere zugewiesen. Kontaktieren Sie Ihren Administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Kopfzeile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-[#2D3142]">
          Mängelmelder — Meldungen ({filteredReports.length})
        </h1>
      </div>

      {/* Status-Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const count =
            filter.value === "all"
              ? reports.length
              : reports.filter((r) => r.status === filter.value).length;

          return (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`inline-flex min-h-[44px] items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-[#2D3142] text-white"
                  : "bg-white text-[#2D3142] hover:bg-gray-100 border"
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Leerer Zustand */}
      {filteredReports.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">Keine Meldungen in dieser Kategorie.</p>
        </div>
      )}

      {/* Meldungs-Liste */}
      <div className="space-y-3">
        {filteredReports.map((report) => {
          const category = getCategoryInfo(report.category);
          const status = getStatusInfo(report.status);
          const isProcessing = actionLoading[report.id] || false;

          return (
            <div
              key={report.id}
              className="rounded-xl bg-white p-4 shadow-sm border border-gray-100"
            >
              {/* Obere Zeile: Kategorie + Status + Datum */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Kategorie-Badge */}
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm">
                    <span>{category.icon}</span>
                    <span className="font-medium">{category.label}</span>
                  </span>
                )}

                {/* Status-Badge */}
                {status && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${status.bgColor} ${status.color}`}
                  >
                    {status.label}
                  </span>
                )}

                {/* Datum */}
                <span className="ml-auto text-xs text-gray-400">
                  {formatDate(report.created_at)}
                </span>
              </div>

              {/* Ort */}
              {report.location_text && (
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Ort:</span> {report.location_text}
                </p>
              )}

              {/* Beschreibung */}
              {report.description && (
                <p className="text-sm text-gray-700 mb-2">{report.description}</p>
              )}

              {/* Status-Notiz (falls vorhanden) */}
              {report.status_note && (
                <p className="text-xs text-gray-500 italic mb-2">
                  Notiz: {report.status_note}
                </p>
              )}

              {/* Aktionen */}
              <div className="flex flex-wrap items-end gap-2 mt-3 pt-3 border-t border-gray-100">
                {/* Status aendern */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500" htmlFor={`status-${report.id}`}>
                    Status ändern
                  </label>
                  <select
                    id={`status-${report.id}`}
                    value={report.status}
                    disabled={isProcessing}
                    onChange={(e) =>
                      handleStatusChange(report, e.target.value as ReportStatus)
                    }
                    className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
                  >
                    {REPORT_STATUS_CONFIG.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status-Notiz */}
                <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                  <label className="text-xs text-gray-500" htmlFor={`note-${report.id}`}>
                    Notiz (optional)
                  </label>
                  <input
                    id={`note-${report.id}`}
                    type="text"
                    placeholder="z.B. Auftrag an Bauhof erteilt"
                    value={statusNotes[report.id] || ""}
                    disabled={isProcessing}
                    onChange={(e) =>
                      setStatusNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
                  />
                </div>

                {/* Loeschen-Button */}
                <button
                  onClick={() => handleDelete(report)}
                  disabled={isProcessing}
                  className="min-h-[44px] min-w-[80px] rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Löschen
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
