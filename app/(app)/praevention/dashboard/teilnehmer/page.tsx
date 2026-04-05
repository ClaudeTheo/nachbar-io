"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
} from "lucide-react";

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  enrolledAt: string;
  attendanceRate: number | null;
  lastActivity: string | null;
  completedDaily: number;
  completedWeekly: number;
  moodTrend: "up" | "down" | "stable" | "unknown";
  status: "active" | "inactive" | "warning";
}

const MOOD_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
  unknown: HelpCircle,
};

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  inactive: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  active: "Aktiv",
  warning: "Warnung",
  inactive: "Inaktiv",
};

export default function TeilnehmerPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dashboard-API holt courseId, dann Teilnehmer laden
    fetch("/api/prevention/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (dashboard) => {
        if (!dashboard) return;
        const res = await fetch(
          `/api/prevention/dashboard/participants?courseId=${dashboard.courseId}`,
        );
        if (res.ok) {
          setParticipants(await res.json());
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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teilnehmer</h1>
          <p className="text-sm text-gray-500">
            {participants.length} eingeschrieben
          </p>
        </div>
      </div>

      {/* Teilnehmer-Liste */}
      <div className="space-y-3">
        {participants.map((p) => {
          const MoodIcon = MOOD_ICONS[p.moodTrend];

          return (
            <div
              key={p.userId}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                    {p.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {p.displayName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Seit{" "}
                      {new Date(p.enrolledAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </span>
              </div>

              {/* Metriken */}
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>
                  {p.attendanceRate != null
                    ? `${Math.round(p.attendanceRate)}% Anwesenheit`
                    : "Keine Daten"}
                </span>
                <span>{p.completedDaily} Übungen</span>
                <span>{p.completedWeekly} Wochen</span>
                <span className="flex items-center gap-1">
                  <MoodIcon className="h-3.5 w-3.5" />
                  Stimmung
                </span>
              </div>

              {/* Letzte Aktivitaet */}
              {p.lastActivity && (
                <p className="mt-1 text-xs text-gray-400">
                  Zuletzt aktiv:{" "}
                  {new Date(p.lastActivity).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {participants.length === 0 && (
        <p className="py-16 text-center text-gray-500">
          Noch keine Teilnehmer eingeschrieben.
        </p>
      )}
    </div>
  );
}
