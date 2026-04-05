"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Activity,
  AlertTriangle,
  Calendar,
  MessageCircle,
  List,
} from "lucide-react";

interface DashboardData {
  totalParticipants: number;
  activeThisWeek: number;
  warnings: {
    userId: string;
    displayName: string;
    lastActivity: string | null;
    daysSinceActive: number;
  }[];
  nextCall: { scheduledAt: string; weekNumber: number } | null;
  aggregatedMood: { before: number; after: number } | null;
  courseTitle: string;
}

const MOOD_LABELS = ["", "Schlecht", "Mittel", "Gut"];

export default function KursleiterDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/prevention/dashboard")
      .then((r) => {
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error("load_error");
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.message === "forbidden") {
          setError("Nur für Kursleiter zugänglich.");
        } else {
          setError("Dashboard konnte nicht geladen werden.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-8 text-center">
        <p className="text-gray-500">{error || "Keine Daten"}</p>
        <Link href="/praevention" className="mt-4 text-emerald-600 underline">
          Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kursleiter-Dashboard
          </h1>
          <p className="text-sm text-gray-500">{data.courseTitle}</p>
        </div>
      </div>

      {/* KPI-Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-gray-500">
            <Users className="h-4 w-4" />
            <span className="text-xs">Teilnehmer</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {data.totalParticipants}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-gray-500">
            <Activity className="h-4 w-4" />
            <span className="text-xs">Aktiv diese Woche</span>
          </div>
          <span className="text-2xl font-bold text-emerald-600">
            {data.activeThisWeek}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-gray-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">Warnungen</span>
          </div>
          <span
            className={`text-2xl font-bold ${
              data.warnings.length > 0 ? "text-amber-500" : "text-gray-900"
            }`}
          >
            {data.warnings.length}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-gray-500">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Nächster Termin</span>
          </div>
          {data.nextCall ? (
            <span className="text-sm font-semibold text-gray-900">
              Woche {data.nextCall.weekNumber}
              <br />
              <span className="text-xs font-normal text-gray-500">
                {new Date(data.nextCall.scheduledAt).toLocaleDateString(
                  "de-DE",
                  {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">Kein Termin</span>
          )}
        </div>
      </div>

      {/* Stimmungs-Aggregat */}
      {data.aggregatedMood && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Durchschnittliche Stimmung (diese Woche)
          </h3>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-gray-500">Vorher</span>
              <p className="text-lg font-bold text-gray-900">
                {MOOD_LABELS[Math.round(data.aggregatedMood.before)] ||
                  data.aggregatedMood.before}
              </p>
            </div>
            <span className="text-gray-300">→</span>
            <div>
              <span className="text-xs text-gray-500">Nachher</span>
              <p className="text-lg font-bold text-emerald-600">
                {MOOD_LABELS[Math.round(data.aggregatedMood.after)] ||
                  data.aggregatedMood.after}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warnungen */}
      {data.warnings.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">
            Inaktive Teilnehmer ({">"}7 Tage)
          </h3>
          <ul className="space-y-2">
            {data.warnings.map((w) => (
              <li
                key={w.userId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-900">{w.displayName}</span>
                <span className="text-amber-600">
                  {w.daysSinceActive} Tage inaktiv
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="space-y-3">
        <Link
          href="/praevention/dashboard/teilnehmer"
          className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <List className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-900">Teilnehmer-Liste</span>
          </div>
          <span className="text-gray-400">→</span>
        </Link>

        <Link
          href="/praevention/dashboard/nachrichten"
          className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-900">Nachrichten</span>
          </div>
          <span className="text-gray-400">→</span>
        </Link>
      </div>
    </div>
  );
}
