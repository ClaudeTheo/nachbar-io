"use client";

// /praevention/dashboard/evaluation — PSS-10 Ergebnisse (Pre/Post Vergleich)
// Aggregiert + anonymisiert, CSV-Export

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, BarChart3 } from "lucide-react";

interface ParticipantPSS {
  displayName: string;
  prePss10: number | null;
  postPss10: number | null;
  change: number | null;
}

export default function EvaluationPage() {
  const [participants, setParticipants] = useState<ParticipantPSS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prevention/dashboard/participants");
        if (!res.ok) return;
        const data = await res.json();

        if (Array.isArray(data)) {
          const mapped = data.map((p: Record<string, unknown>) => ({
            displayName: (p.display_name as string) || "Unbekannt",
            prePss10: (p.pre_pss10_score as number) ?? null,
            postPss10: (p.post_pss10_score as number) ?? null,
            change:
              p.pre_pss10_score != null && p.post_pss10_score != null
                ? (p.post_pss10_score as number) - (p.pre_pss10_score as number)
                : null,
          }));
          setParticipants(mapped);
        }
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Aggregierte Werte
  const withBoth = participants.filter(
    (p) => p.prePss10 !== null && p.postPss10 !== null,
  );
  const avgPre =
    withBoth.length > 0
      ? withBoth.reduce((s, p) => s + (p.prePss10 ?? 0), 0) / withBoth.length
      : null;
  const avgPost =
    withBoth.length > 0
      ? withBoth.reduce((s, p) => s + (p.postPss10 ?? 0), 0) / withBoth.length
      : null;

  // CSV-Export
  const exportCSV = () => {
    const bom = "\uFEFF";
    const header = "Name;PSS-10 Vorher;PSS-10 Nachher;Veränderung\n";
    const rows = participants
      .map(
        (p) =>
          `${p.displayName};${p.prePss10 ?? ""};${p.postPss10 ?? ""};${p.change ?? ""}`,
      )
      .join("\n");

    const blob = new Blob([bom + header + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pss10-evaluation.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stress-Level Interpretation
  const stressLevel = (score: number) => {
    if (score <= 13) return { label: "Niedrig", color: "text-emerald-700" };
    if (score <= 26) return { label: "Mittel", color: "text-amber-700" };
    return { label: "Hoch", color: "text-red-700" };
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/praevention/dashboard"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              PSS-10 Evaluation
            </h1>
            <p className="text-xs text-gray-500">Pre/Post Vergleich</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
        >
          <Download className="h-4 w-4" />
          CSV
        </button>
      </div>

      {/* Aggregierte KPIs */}
      {avgPre !== null && avgPost !== null && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-amber-50 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {avgPre.toFixed(1)}
            </p>
            <p className="text-xs text-amber-600">Ø Vorher</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">
              {avgPost.toFixed(1)}
            </p>
            <p className="text-xs text-emerald-600">Ø Nachher</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {(avgPost - avgPre).toFixed(1)}
            </p>
            <p className="text-xs text-blue-600">Ø Veränderung</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          Wird geladen...
        </div>
      ) : participants.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
          <BarChart3 className="h-8 w-8" />
          <p>Noch keine PSS-10 Daten vorhanden</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Teilnehmer
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  Vorher
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  Nachher
                </th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">
                  Differenz
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {p.displayName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.prePss10 !== null ? (
                      <span className={stressLevel(p.prePss10).color}>
                        {p.prePss10}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.postPss10 !== null ? (
                      <span className={stressLevel(p.postPss10).color}>
                        {p.postPss10}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.change !== null ? (
                      <span
                        className={
                          p.change < 0 ? "text-emerald-700" : "text-red-700"
                        }
                      >
                        {p.change > 0 ? "+" : ""}
                        {p.change}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-gray-400">
        PSS-10: 0-13 = niedriger Stress, 14-26 = mittlerer Stress, 27-40 = hoher
        Stress
      </p>
    </div>
  );
}
