"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Gift,
  Users,
  Mail,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface CaregiverLink {
  id: string;
  resident_id: string;
  resident?: { display_name: string; avatar_url: string | null };
}

interface Course {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
}

const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

export default function BuchenFuerAnderePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <BuchenFuerAndereContent />
    </Suspense>
  );
}

function BuchenFuerAndereContent() {
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("course_id");

  const [courses, setCourses] = useState<Course[]>([]);
  const [links, setLinks] = useState<CaregiverLink[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(courseIdParam || "");
  const [giftMode, setGiftMode] = useState<"linked" | "email">("linked");
  const [selectedResident, setSelectedResident] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [coursesRes, linksRes] = await Promise.all([
        fetch("/api/prevention/courses"),
        fetch("/api/caregiver/links"),
      ]);

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        const active = data.filter(
          (c: Course) => c.status === "active" || c.status === "planned",
        );
        setCourses(active);
        if (!courseIdParam && active.length > 0) {
          setSelectedCourse(active[0].id);
        }
      }

      if (linksRes.ok) {
        const data = await linksRes.json();
        setLinks(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          setSelectedResident(data[0].resident_id);
        }
      }
    } catch {
      setError("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  async function handleGiftBooking() {
    if (!selectedCourse) return;
    setSubmitting(true);
    setError(null);

    const userId = giftMode === "linked" ? selectedResident : undefined;

    try {
      const res = await fetch("/api/prevention/booking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          payerType: "caregiver",
          payerUserId: userId,
          payerName: giftMode === "email" ? recipientName : undefined,
          payerEmail: giftMode === "email" ? recipientEmail : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Buchung fehlgeschlagen");
        return;
      }

      if (data.type === "pilot_free") {
        setSuccess(true);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Geschenk-Buchung erfolgreich!
        </h1>
        <p className="mb-8 text-gray-600">
          Ihr Angehöriger wurde in den Kurs eingeschrieben und kann sofort
          starten.
        </p>
        <Link
          href="/praevention"
          className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white hover:bg-emerald-700"
          style={{ minHeight: "48px" }}
        >
          Zur Kursübersicht
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention/buchen"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Für Angehörigen buchen
          </h1>
          <p className="text-sm text-gray-500">
            z. B. für Ihre Mutter, Ihren Vater oder eine nahestehende Person
          </p>
        </div>
      </div>

      {/* Kurs */}
      {courses.length > 0 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Kurs
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
            style={{ minHeight: "48px" }}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — ab{" "}
                {new Date(c.starts_at).toLocaleDateString("de-DE")}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empfaenger-Modus */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Für wen buchen Sie?
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setGiftMode("linked")}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${
              giftMode === "linked"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
            style={{ minHeight: "48px" }}
          >
            <Users className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              Verknüpfter Bewohner
            </span>
          </button>
          <button
            onClick={() => setGiftMode("email")}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors ${
              giftMode === "email"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
            style={{ minHeight: "48px" }}
          >
            <Mail className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              Per E-Mail
            </span>
          </button>
        </div>
      </div>

      {/* Verknuepfter Bewohner */}
      {giftMode === "linked" && (
        <div className="mb-6">
          {links.length > 0 ? (
            <div className="space-y-2">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setSelectedResident(link.resident_id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedResident === link.resident_id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                  style={{ minHeight: "48px" }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    {link.resident?.display_name?.[0] || "?"}
                  </div>
                  <span className="font-medium text-gray-900">
                    {link.resident?.display_name || "Bewohner"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
              Sie haben noch keine verknüpften Bewohner. Nutzen Sie die
              E-Mail-Option oder verknüpfen Sie erst einen Bewohner über die
              Angehörigen-Funktion.
            </p>
          )}
        </div>
      )}

      {/* E-Mail-Eingabe */}
      {giftMode === "email" && (
        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name des Empfängers
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Vorname Nachname"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
              style={{ minHeight: "48px" }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="name@beispiel.de"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
              style={{ minHeight: "48px" }}
            />
          </div>
        </div>
      )}

      {/* Pilot-Info */}
      {PILOT_MODE && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            🎉 Pilot-Phase: Dieser Kurs ist kostenlos!
          </p>
        </div>
      )}

      {/* Fehler */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Buchen */}
      <button
        onClick={handleGiftBooking}
        disabled={
          submitting ||
          !selectedCourse ||
          (giftMode === "linked" && !selectedResident) ||
          (giftMode === "email" && (!recipientEmail || !recipientName))
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        style={{ minHeight: "48px" }}
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Gift className="h-5 w-5" />
            {PILOT_MODE ? "Kostenlos verschenken" : "Jetzt verschenken"}
          </>
        )}
      </button>
    </div>
  );
}
