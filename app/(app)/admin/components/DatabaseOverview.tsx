"use client";

import { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  ExternalLink,
  Table2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableInfo {
  name: string;
  category: string;
  rowCount: number;
  error?: string;
}

interface Summary {
  totalTables: number;
  activeTables: number;
  missingTables: number;
  totalRows: number;
  largestTable: { name: string; rows: number } | null;
}

export function DatabaseOverview() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [editorUrl, setEditorUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Core"]));

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/db-overview");
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        setSummary(data.summary || null);
        setEditorUrl(data.supabaseEditorUrl || "");
      }
    } catch {
      // Fehler still ignorieren
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  // Tabellen nach Kategorie gruppieren
  const grouped = tables.reduce<Record<string, TableInfo[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  // Kategorien sortieren
  const categoryOrder = ["Core", "Content", "Social", "Features", "System", "Care"];
  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function expandAll() {
    setExpandedCategories(new Set(sortedCategories));
  }

  function formatNumber(n: number) {
    return n.toLocaleString("de-DE");
  }

  return (
    <div className="space-y-4">
      {/* Zusammenfassung */}
      {summary && (
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-anthrazit">
              <Database className="h-4 w-4 text-quartier-green" />
              Datenbank-Uebersicht
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs">
                Alle aufklappen
              </Button>
              <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              {editorUrl && (
                <a
                  href={editorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Supabase Editor
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Tabellen" value={String(summary.activeTables)} sub={`${summary.missingTables} fehlen`} />
            <StatBox label="Gesamtzeilen" value={formatNumber(summary.totalRows)} />
            <StatBox
              label="Groesste Tabelle"
              value={summary.largestTable?.name || "—"}
              sub={summary.largestTable ? `${formatNumber(summary.largestTable.rows)} Zeilen` : undefined}
            />
            <StatBox label="Kategorien" value={String(sortedCategories.length)} />
          </div>
        </div>
      )}

      {/* Tabellen nach Kategorie */}
      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-quartier-green mb-2" />
          Tabellen werden geladen...
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCategories.map((category) => {
            const catTables = grouped[category];
            const catRows = catTables.reduce((s, t) => s + Math.max(t.rowCount, 0), 0);
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="rounded-xl border bg-white overflow-hidden">
                {/* Kategorie-Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold text-anthrazit">{category}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {catTables.length} Tabellen
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatNumber(catRows)} Zeilen
                  </span>
                </button>

                {/* Tabellen-Liste */}
                {isExpanded && (
                  <div className="border-t divide-y">
                    {catTables
                      .sort((a, b) => b.rowCount - a.rowCount)
                      .map((table) => (
                        <div
                          key={table.name}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-muted/10"
                        >
                          <Table2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-xs font-mono">{table.name}</span>

                          {table.error ? (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              {table.error}
                            </span>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              table.rowCount === 0
                                ? "bg-gray-100 text-gray-500"
                                : table.rowCount > 100
                                  ? "bg-green-50 text-green-700"
                                  : "bg-blue-50 text-blue-700"
                            }`}>
                              {formatNumber(table.rowCount)}
                            </span>
                          )}

                          <a
                            href={`https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/editor/${table.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                            title={`${table.name} in Supabase oeffnen`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-anthrazit">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
