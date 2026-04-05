"use client";

import { useEffect, useState } from "react";
import { Heart, BookOpen, ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { CourseCard } from "@/components/praevention/CourseCard";
import { WeekProgress } from "@/components/praevention/WeekProgress";

interface Course {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  max_participants: number;
  status: string;
  enrollment_count: number;
  instructor?: { display_name: string; avatar_url: string | null } | null;
}

interface ProgressData {
  enrollment: {
    id: string;
    course_id: string;
    course?: {
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      status: string;
      instructor?: { display_name: string } | null;
    };
  };
  currentWeek: number;
  completedDaily: number;
  completedWeekly: number;
  totalSessions: number;
  weeks: { week: number; dailyCompleted: number; weeklyCompleted: boolean }[];
}

export default function PraeventionPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [coursesRes, progressRes] = await Promise.all([
        fetch("/api/prevention/courses"),
        fetch("/api/prevention/progress"),
      ]);

      if (coursesRes.ok) {
        setCourses(await coursesRes.json());
      }
      if (progressRes.ok) {
        setProgress(await progressRes.json());
      }
    } catch (err) {
      console.error("Daten laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(courseId: string) {
    setEnrolling(true);
    try {
      const res = await fetch("/api/prevention/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, payerType: "pilot_free" }),
      });

      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Einschreibung fehlgeschlagen");
      }
    } catch {
      alert("Netzwerkfehler bei der Einschreibung");
    } finally {
      setEnrolling(false);
    }
  }

  const enrolledCourseIds = new Set(
    progress.map((p) => p.enrollment.course_id),
  );

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
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prävention</h1>
          <p className="text-sm text-gray-500">Aktiv im Quartier</p>
        </div>
      </div>

      {/* Eingeschrieben: Fortschritts-Dashboard */}
      {progress.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Mein Kurs</h2>

          {progress.map((p) => (
            <div key={p.enrollment.id} className="space-y-4">
              {/* Kurs-Info */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <Heart className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {p.enrollment.course?.title || "Praeventionskurs"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Woche {p.currentWeek} von 8 — {p.completedDaily} Übungen,{" "}
                      {p.completedWeekly} Wochen-Sitzungen
                    </p>
                  </div>
                </div>
              </div>

              {/* Wochen-Fortschritt */}
              <WeekProgress weeks={p.weeks} currentWeek={p.currentWeek} />

              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3">
                <Link
                  href="/praevention/sitzung"
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700"
                  style={{ minHeight: "48px" }}
                >
                  <Heart className="h-5 w-5" />
                  Übung
                </Link>
                <Link
                  href="/praevention/materialien"
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ minHeight: "48px" }}
                >
                  <BookOpen className="h-5 w-5" />
                  Material
                </Link>
                <a
                  href={`/api/prevention/calendar.ics?enrollmentId=${p.enrollment.id}`}
                  download
                  className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ minHeight: "48px" }}
                >
                  <CalendarDays className="h-5 w-5" />
                  Kalender
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verfuegbare Kurse */}
      {courses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {progress.length > 0 ? "Weitere Kurse" : "Verfügbare Kurse"}
          </h2>

          {courses
            .filter((c) => !enrolledCourseIds.has(c.id))
            .map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                instructor={course.instructor}
                startsAt={course.starts_at}
                endsAt={course.ends_at}
                maxParticipants={course.max_participants}
                enrollmentCount={course.enrollment_count}
                status={course.status}
                isEnrolled={false}
                onEnroll={enrolling ? undefined : handleEnroll}
              />
            ))}

          {/* Bereits eingeschriebene Kurse */}
          {courses
            .filter((c) => enrolledCourseIds.has(c.id))
            .map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                instructor={course.instructor}
                startsAt={course.starts_at}
                endsAt={course.ends_at}
                maxParticipants={course.max_participants}
                enrollmentCount={course.enrollment_count}
                status={course.status}
                isEnrolled={true}
              />
            ))}
        </div>
      )}

      {/* Leerer Zustand */}
      {courses.length === 0 && progress.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Heart className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Noch keine Kurse verfügbar
          </h3>
          <p className="max-w-sm text-sm text-gray-500">
            Sobald ein Präventionskurs in Ihrem Quartier angeboten wird,
            erscheint er hier. Schauen Sie bald wieder vorbei.
          </p>
        </div>
      )}

      {/* Info-Box */}
      <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-emerald-800">
          Was ist &quot;Aktiv im Quartier&quot;?
        </h3>
        <p className="text-sm text-emerald-700">
          Ein 8-wöchiger Kurs zur Stressbewältigung nach § 20 SGB V. Tägliche
          KI-geführte Übungen (10-15 Min) und wöchentliche Gruppeneinheiten mit
          qualifiziertem Kursleiter. Ihre Krankenkasse erstattet in der Regel
          75-100% der Kosten.
        </p>
      </div>
    </div>
  );
}
