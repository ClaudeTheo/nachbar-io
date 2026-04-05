"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Gift,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  max_participants: number;
  enrollment_count: number;
  status: string;
  instructor?: { display_name: string } | null;
}

interface InsuranceConfig {
  id: string;
  name: string;
  short_name: string;
  submission_type: string;
}

const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE === "true";

export default function BuchenPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const courseIdParam = searchParams.get("course_id");

  const [courses, setCourses] = useState<Course[]>([]);
  const [insurances, setInsurances] = useState<InsuranceConfig[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedInsurance, setSelectedInsurance] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "sepa" | "invoice"
  >("card");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [coursesRes, insuranceRes] = await Promise.all([
        fetch("/api/prevention/courses"),
        fetch("/api/prevention/insurance-configs"),
      ]);

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(
          data.filter(
            (c: Course) => c.status === "active" || c.status === "planned",
          ),
        );
        if (data.length > 0 && !courseIdParam) {
          setSelectedCourse(data[0].id);
        } else if (courseIdParam) {
          setSelectedCourse(courseIdParam);
        }
      }
      if (insuranceRes.ok) {
        setInsurances(await insuranceRes.json());
      }
    } catch {
      setError("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!selectedCourse) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/prevention/booking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          payerType: "self",
          insuranceConfigId: selectedInsurance || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Buchung fehlgeschlagen");
        return;
      }

      if (data.type === "pilot_free") {
        // Pilot-Modus: Direkt eingeschrieben
        window.location.href = `/praevention?enrolled=true`;
      } else if (data.url) {
        // Stripe Checkout
        window.location.href = data.url;
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  // Erfolgs-Seite
  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Erfolgreich gebucht!
        </h1>
        <p className="mb-8 text-gray-600">
          Sie sind jetzt im Präventionskurs eingeschrieben. Starten Sie gleich
          mit Ihrer ersten Übung.
        </p>
        <div className="space-y-3">
          <Link
            href="/praevention/sitzung"
            className="block rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white hover:bg-emerald-700"
            style={{ minHeight: "48px" }}
          >
            Erste Übung starten
          </Link>
          <Link
            href="/praevention"
            className="block rounded-xl border border-gray-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
            style={{ minHeight: "48px" }}
          >
            Zur Kursübersicht
          </Link>
        </div>
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

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurs buchen</h1>
          <p className="text-sm text-gray-500">Für sich selbst</p>
        </div>
      </div>

      {/* Kurs-Auswahl */}
      {courses.length > 1 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Kurs auswählen
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

      {/* Kurs-Details */}
      {selectedCourseData && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <h3 className="font-semibold text-gray-900">
            {selectedCourseData.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {new Date(selectedCourseData.starts_at).toLocaleDateString("de-DE")}{" "}
            bis{" "}
            {new Date(selectedCourseData.ends_at).toLocaleDateString("de-DE")}
          </p>
          {selectedCourseData.instructor && (
            <p className="mt-1 text-sm text-gray-600">
              Kursleitung: {selectedCourseData.instructor.display_name}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            {selectedCourseData.enrollment_count} /{" "}
            {selectedCourseData.max_participants} Plätze belegt
          </p>
        </div>
      )}

      {/* Krankenkasse */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Ihre Krankenkasse (optional — für Erstattung)
        </label>
        <select
          value={selectedInsurance}
          onChange={(e) => setSelectedInsurance(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
          style={{ minHeight: "48px" }}
        >
          <option value="">— Keine Angabe —</option>
          {insurances.map((ins) => (
            <option key={ins.id} value={ins.id}>
              {ins.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Die meisten Kassen erstatten 75-100% nach Abschluss.
        </p>
      </div>

      {/* Zahlungsmethode (nicht im Pilot-Modus) */}
      {!PILOT_MODE && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Zahlungsmethode
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod("card")}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                paymentMethod === "card"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              style={{ minHeight: "48px" }}
            >
              <CreditCard className="h-5 w-5 text-gray-600" />
              <div>
                <span className="font-medium text-gray-900">Karte / SEPA</span>
                <p className="text-xs text-gray-500">
                  Kredit-/Debitkarte oder Lastschrift
                </p>
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod("invoice")}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                paymentMethod === "invoice"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              style={{ minHeight: "48px" }}
            >
              <Building2 className="h-5 w-5 text-gray-600" />
              <div>
                <span className="font-medium text-gray-900">
                  Rechnung (14 Tage)
                </span>
                <p className="text-xs text-gray-500">
                  Für Organisationen und Einrichtungen
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Pilot-Modus Info */}
      {PILOT_MODE && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            🎉 Pilot-Phase: Dieser Kurs ist derzeit kostenlos!
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Als Pilot-Teilnehmer entstehen Ihnen keine Kosten.
          </p>
        </div>
      )}

      {/* Preis-Zusammenfassung */}
      {!PILOT_MODE && (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Kursgebühr</span>
            <span className="text-lg font-bold text-gray-900">149,00 €</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Einmalige Zahlung. Erstattung durch Ihre Kasse nach Abschluss.
          </p>
        </div>
      )}

      {/* Fehler */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Buchen + Fuer-andere Link */}
      <div className="space-y-3">
        <button
          onClick={handleCheckout}
          disabled={submitting || !selectedCourse}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          style={{ minHeight: "48px" }}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : PILOT_MODE ? (
            "Kostenlos einschreiben"
          ) : (
            "Jetzt buchen"
          )}
        </button>

        <Link
          href={`/praevention/buchen-fuer-andere${selectedCourse ? `?course_id=${selectedCourse}` : ""}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
          style={{ minHeight: "48px" }}
        >
          <Gift className="h-5 w-5" />
          Für einen Angehörigen buchen
        </Link>
      </div>
    </div>
  );
}
