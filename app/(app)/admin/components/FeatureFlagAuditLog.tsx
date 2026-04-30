"use client";

import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

type AuditAction = "insert" | "update" | "delete";

interface AuditUser {
  id?: string;
  email_hash: string | null;
  display_name: string | null;
}

interface FeatureFlagAuditEntry {
  id: number;
  flag_key: string;
  action: AuditAction;
  enabled_before: boolean | null;
  enabled_after: boolean | null;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  changed_by_user: AuditUser | AuditUser[] | null;
}

const ACTION_BADGE_CLASS: Record<AuditAction, string> = {
  insert: "bg-quartier-green/10 text-quartier-green border-quartier-green/20",
  update: "bg-alert-amber/10 text-alert-amber border-alert-amber/20",
  delete: "bg-red-50 text-red-700 border-red-200",
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
    + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatBoolean(value: boolean | null) {
  if (value === null) return "—";
  return value ? "TRUE" : "FALSE";
}

function getUserLabel(entry: FeatureFlagAuditEntry) {
  const user = Array.isArray(entry.changed_by_user)
    ? entry.changed_by_user[0]
    : entry.changed_by_user;

  return user?.display_name || user?.email_hash || "System";
}

function truncateReason(reason: string | null) {
  if (!reason) return "—";
  if (reason.length <= 60) return reason;
  return `${reason.slice(0, 60)}...`;
}

export function FeatureFlagAuditLog() {
  const [entries, setEntries] = useState<FeatureFlagAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAuditLog() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("feature_flags_audit_log")
        .select(
          "id, flag_key, action, enabled_before, enabled_after, changed_by, reason, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      const rows = (data ?? []) as FeatureFlagAuditEntry[];
      const changedByIds = [
        ...new Set(rows.map((entry) => entry.changed_by).filter(Boolean)),
      ] as string[];
      const userById = new Map<string, AuditUser>();

      if (changedByIds.length > 0) {
        const { data: userRows } = await supabase
          .from("users")
          .select("id,email_hash,display_name")
          .in("id", changedByIds);

        for (const user of (userRows ?? []) as AuditUser[]) {
          if (user.id) userById.set(user.id, user);
        }
      }

      if (!active) return;
      setEntries(
        rows.map((entry) => ({
          ...entry,
          changed_by_user:
            entry.changed_by_user
            ?? (entry.changed_by ? userById.get(entry.changed_by) : null)
            ?? null,
        })),
      );
      setLoading(false);
    }

    void loadAuditLog();

    return () => {
      active = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return entries;

    return entries.filter((entry) =>
      entry.flag_key.toLowerCase().includes(normalizedSearch),
    );
  }, [entries, search]);

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-quartier-green" />
            <h2 className="text-lg font-semibold text-anthrazit">
              Feature-Flag Audit-Log
            </h2>
          </div>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4"
              data-testid="audit-log-skeleton"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-quartier-green" />
          <h2 className="text-lg font-semibold text-anthrazit">
            Feature-Flag Audit-Log
          </h2>
          <Badge variant="secondary" className="text-[10px]">
            letzte 50
          </Badge>
        </div>

        <div className="mb-4 max-w-sm space-y-2">
          <label
            htmlFor="feature-flag-audit-search"
            className="text-sm font-medium text-anthrazit"
          >
            Flag-Key suchen
          </label>
          <Input
            id="feature-flag-audit-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="z.B. BILLING_ENABLED"
          />
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Aenderungen aufgezeichnet
          </p>
        ) : (
          <div
            className="overflow-x-auto rounded-xl border border-border/70"
            data-testid="feature-flag-audit-log"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 pr-4 font-medium">Zeitstempel</th>
                  <th className="px-3 py-2 pr-4 font-medium">Flag-Key</th>
                  <th className="px-3 py-2 pr-4 font-medium">Aktion</th>
                  <th className="px-3 py-2 pr-4 font-medium">
                    Vorher -&gt; Nachher
                  </th>
                  <th className="px-3 py-2 pr-4 font-medium">Wer</th>
                  <th className="px-3 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="px-3 py-3 pr-4 text-xs text-muted-foreground">
                      {formatTimestamp(entry.created_at)}
                    </td>
                    <td className="px-3 py-3 pr-4 font-mono text-xs text-anthrazit">
                      {entry.flag_key}
                    </td>
                    <td className="px-3 py-3 pr-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${ACTION_BADGE_CLASS[entry.action]}`}
                        data-testid={`action-badge-${entry.action}`}
                      >
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 pr-4 font-mono text-xs">
                      {formatBoolean(entry.enabled_before)} -&gt;{" "}
                      {formatBoolean(entry.enabled_after)}
                    </td>
                    <td className="px-3 py-3 pr-4 text-xs">
                      {getUserLabel(entry)}
                    </td>
                    <td
                      className="px-3 py-3 text-xs text-muted-foreground"
                      title={entry.reason ?? undefined}
                    >
                      {truncateReason(entry.reason)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
