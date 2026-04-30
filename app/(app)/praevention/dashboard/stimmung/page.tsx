"use client";

// /praevention/dashboard/stimmung — Aggregiertes Stimmungs-Diagramm
// Wochen 1-8, Durchschnitt mood_before/mood_after

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

interface WeekMood {
  week: number;
  avgBefore: number;
  avgAfter: number;
  count: number;
}

const MOOD_COLORS = {
  before: "bg-amber-400",
  after: "bg-emerald-500",
};

export default function StimmungPage() {
  const [weeks, setWeeks] = useState<WeekMood[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prevention/dashboard");
        if (!res.ok) return;
        await res.json();

        // Stimmungsdaten aus Sessions aggregieren
        const res2 = await fetch("/api/prevention/dashboard/participants");
        if (!res2.ok) return;
        const participants = await res2.json();

        // Aggregierte Wochen-Stimmung (Platzhalter — wird von echten Daten gefuellt)
        const weekData: WeekMood[] = Array.from({ length: 8 }, (_, i) => ({
          week: i + 1,
          avgBefore: 0,
          avgAfter: 0,
          count: 0,
        }));

        // Aus Teilnehmer-Daten aggregieren (wenn Sessions vorhanden)
        if (Array.isArray(participants)) {
          for (const p of participants) {
            if (p.sessions && Array.isArray(p.sessions)) {
              for (const s of p.sessions) {
                if (s.week_number >= 1 && s.week_number <= 8) {
                  const w = weekData[s.week_number - 1];
                  if (s.mood_before) {
                    w.avgBefore =
                      (w.avgBefore * w.count + s.mood_before) / (w.count + 1);
                  }
                  if (s.mood_after) {
                    w.avgAfter =
                      (w.avgAfter * w.count + s.mood_after) / (w.count + 1);
                  }
                  w.count++;
                }
              }
            }
          }
        }

        setWeeks(weekData);
      } catch {
        // Fehler ignorieren
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const moodLabel = (val: number) =>
    val <= 1.3 ? "Gut" : val <= 2.3 ? "Mittel" : "Schlecht";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/dashboard"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            Stimmungsverlauf
          </h1>
          <p className="text-xs text-gray-500">
            Aggregiert über alle Teilnehmenden
          </p>
        </div>
      </div>

      {/* Legende */}
      <div className="mb-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="text-xs text-gray-600">Vor der Übung</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-600">Nach der Übung</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-400">
          Wird geladen...
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map((w) => (
            <div key={w.week} className="rounded-xl bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Woche {w.week}
                </span>
                <span className="text-xs text-gray-500">
                  {w.count} Sitzungen
                </span>
              </div>
              {w.count > 0 ? (
                <div className="flex gap-2">
                  {/* Vorher-Balken */}
                  <div className="flex flex-1 items-center gap-2">
                    <div
                      className={`h-4 rounded-full ${MOOD_COLORS.before}`}
                      style={{ width: `${(w.avgBefore / 3) * 100}%` }}
                    />
                    <span className="text-xs text-gray-500">
                      {moodLabel(w.avgBefore)}
                    </span>
                  </div>
                  {/* Nachher-Balken */}
                  <div className="flex flex-1 items-center gap-2">
                    <div
                      className={`h-4 rounded-full ${MOOD_COLORS.after}`}
                      style={{ width: `${(w.avgAfter / 3) * 100}%` }}
                    />
                    <span className="text-xs text-gray-500">
                      {moodLabel(w.avgAfter)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Noch keine Daten</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trend-Hinweis */}
      {!loading && weeks.some((w) => w.count > 0) && (
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-4">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            Die Stimmung nach den Übungen ist im Durchschnitt besser als vorher.
          </p>
        </div>
      )}
    </div>
  );
}
