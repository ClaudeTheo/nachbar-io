// components/org/OrgAuditLog.tsx
// Nachbar.io — Audit-Log Viewer fuer Pro Community Organisationen
"use client";

import { useCallback, useEffect, useState } from "react";

// Typen fuer Audit-Log-Eintraege (aus API)
interface AuditEntry {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

// Aktionsfarben und Labels
const ACTION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  org_created: {
    label: "Erstellt",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
  member_added: {
    label: "Hinzugefügt",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
  member_removed: {
    label: "Entfernt",
    className: "bg-[#EF4444]/10 text-[#EF4444]",
  },
  role_changed: {
    label: "Rolle geändert",
    className: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  user_muted: {
    label: "Stummgeschaltet",
    className: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  user_banned: {
    label: "Gesperrt",
    className: "bg-[#EF4444]/10 text-[#EF4444]",
  },
  user_unmuted: {
    label: "Freigegeben",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
  user_unbanned: {
    label: "Entsperrt",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
  medication_created: {
    label: "Medikament angelegt",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
  medication_updated: {
    label: "Medikament geändert",
    className: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  escalation_resolved: {
    label: "Eskalation gelöst",
    className: "bg-[#4CAF87]/10 text-[#4CAF87]",
  },
};

// Fallback fuer unbekannte Aktionen
const DEFAULT_ACTION_CONFIG = {
  label: "Aktion",
  className: "bg-gray-100 text-gray-600",
};

const PAGE_SIZE = 20;

interface OrgAuditLogProps {
  orgId: string;
}

export function OrgAuditLog({ orgId }: OrgAuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audit-Log laden
  const loadEntries = useCallback(
    async (offset = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch(
          `/api/organizations/${orgId}/audit?limit=${PAGE_SIZE}&offset=${offset}`
        );
        if (!res.ok) {
          setError("Audit-Log konnte nicht geladen werden.");
          return;
        }

        const data: AuditResponse = await res.json();
        setEntries((prev) => (append ? [...prev, ...data.data] : data.data));
        setTotal(data.total);
      } catch {
        setError("Verbindungsfehler beim Laden des Audit-Logs.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Zeitstempel formatieren (deutsch)
  function formatTimestamp(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Ladezustand
  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4CAF87] border-t-transparent" />
      </div>
    );
  }

  // Fehler
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  const hasMore = entries.length < total;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#2D3142]">
        Audit-Log ({total} Einträge)
      </h2>

      {entries.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-400">
            Noch keine Audit-Eintraege vorhanden.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const config =
              ACTION_CONFIG[entry.action] ?? DEFAULT_ACTION_CONFIG;

            return (
              <div
                key={entry.id}
                className="flex items-start justify-between rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Aktions-Badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
                    >
                      {config.label}
                    </span>
                    {/* Aktionsname falls unbekannt */}
                    {!ACTION_CONFIG[entry.action] && (
                      <span className="text-xs text-gray-400">
                        ({entry.action})
                      </span>
                    )}
                  </div>
                  {/* Details */}
                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {Object.entries(entry.details)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(", ")}
                    </p>
                  )}
                </div>
                {/* Zeitstempel */}
                <span className="ml-3 whitespace-nowrap text-xs text-gray-400">
                  {formatTimestamp(entry.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Mehr laden */}
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => loadEntries(entries.length, true)}
            className="inline-flex min-h-[44px] items-center rounded-lg border px-6 py-2 text-sm font-medium text-[#2D3142] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? "Wird geladen..." : "Weitere laden"}
          </button>
        </div>
      )}
    </div>
  );
}
