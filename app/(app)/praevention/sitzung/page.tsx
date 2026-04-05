"use client";

// /praevention/sitzung — Taegliche KI-Sitzung
// Enrollment-Check, aktuelle Woche laden, SessionScreen rendern

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import SessionScreen from "@/modules/praevention/components/SessionScreen";

interface ProgressData {
  enrollment: { id: string; course_id: string };
  currentWeek: number;
}

export default function SitzungPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/prevention/progress");
        if (!res.ok) {
          if (res.status === 404) {
            setError("not_enrolled");
          } else {
            setError("load_error");
          }
          return;
        }
        const data = await res.json();
        // API gibt Array zurueck — erste Einschreibung nehmen
        const first = Array.isArray(data) ? data[0] : data;
        if (!first || !first.enrollment) {
          setError("not_enrolled");
          return;
        }
        setProgress(first);
      } catch {
        setError("load_error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Sitzung abschliessen
  const handleComplete = async (data: {
    moodBefore: number | null;
    moodAfter: number | null;
    durationSeconds: number;
    escalationFlag: string;
  }) => {
    if (!progress) return;

    try {
      await fetch("/api/prevention/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: progress.enrollment.id,
          weekNumber: progress.currentWeek,
          sessionType: "daily_mini",
          durationSeconds: data.durationSeconds,
          moodBefore: data.moodBefore,
          moodAfter: data.moodAfter,
          escalationFlag: data.escalationFlag,
        }),
      });
      setCompleted(true);
    } catch {
      // Fehler ignorieren — Sitzung wurde trotzdem durchgefuehrt
      setCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error === "not_enrolled") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-600">
          Sie sind noch nicht in einen Kurs eingeschrieben.
        </p>
        <Link
          href="/praevention"
          className="rounded-xl bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700"
        >
          Kurse ansehen
        </Link>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-red-600">Fehler beim Laden der Sitzung.</p>
        <Link href="/praevention" className="text-emerald-600 underline">
          Zurück
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-800">
          Sitzung gespeichert
        </h2>
        <p className="text-gray-600">+10 Punkte für Ihre tägliche Übung!</p>
        <Link
          href="/praevention"
          className="rounded-xl bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700"
        >
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <SessionScreen
        enrollmentId={progress.enrollment.id}
        weekNumber={progress.currentWeek}
        onComplete={handleComplete}
        onCancel={() => router.push("/praevention")}
      />
    </div>
  );
}
