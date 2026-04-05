"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InsuranceConfig {
  id: string;
  name: string;
  short_name: string;
  submission_type: string;
}

interface Enrollment {
  id: string;
  certificate_generated: boolean;
  reimbursement_started_at: string | null;
  insurance_config_id: string | null;
  course?: { title: string };
}

export default function ErstattungPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [insurances, setInsurances] = useState<InsuranceConfig[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState("");
  const [selectedInsurance, setSelectedInsurance] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [progressRes, insuranceRes] = await Promise.all([
        fetch("/api/prevention/progress"),
        fetch("/api/prevention/insurance-configs"),
      ]);

      if (progressRes.ok) {
        const data = await progressRes.json();
        // Nur abgeschlossene Kurse mit Zertifikat zeigen
        const eligible = data
          .filter(
            (p: { enrollment: Enrollment }) =>
              p.enrollment.certificate_generated,
          )
          .map((p: { enrollment: Enrollment }) => p.enrollment);
        setEnrollments(eligible);
        if (eligible.length > 0) setSelectedEnrollment(eligible[0].id);
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

  async function handleStart() {
    if (!selectedEnrollment || !selectedInsurance) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/prevention/reimbursement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: selectedEnrollment,
          insuranceConfigId: selectedInsurance,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      router.push(
        `/praevention/erstattung/bescheinigung?enrollment=${selectedEnrollment}`,
      );
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/praevention"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Erstattung</h1>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="mb-2 font-semibold text-gray-700">
            Noch kein Zertifikat
          </h3>
          <p className="text-sm text-gray-500">
            Schließen Sie zuerst einen Kurs ab und lassen Sie sich das
            Zertifikat ausstellen. Danach können Sie hier die Erstattung bei
            Ihrer Krankenkasse beantragen.
          </p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Erstattung</h1>
          <p className="text-sm text-gray-500">Schritt 1 von 4</p>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <h3 className="mb-1 text-sm font-semibold text-emerald-800">
          Krankenkassen-Erstattung
        </h3>
        <p className="text-sm text-emerald-700">
          Die meisten Kassen erstatten 75-100% der Kursgebühren. Wir führen Sie
          Schritt für Schritt durch den Prozess.
        </p>
      </div>

      {/* Kurs waehlen */}
      {enrollments.length > 1 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Kurs auswählen
          </label>
          <select
            value={selectedEnrollment}
            onChange={(e) => setSelectedEnrollment(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base"
            style={{ minHeight: "48px" }}
          >
            {enrollments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.course?.title || "Präventionskurs"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Krankenkasse waehlen */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Ihre Krankenkasse
        </label>
        <div className="grid grid-cols-2 gap-3">
          {insurances.map((ins) => (
            <button
              key={ins.id}
              onClick={() => setSelectedInsurance(ins.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedInsurance === ins.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              style={{ minHeight: "48px" }}
            >
              <span className="text-sm font-medium text-gray-900">
                {ins.short_name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fehler */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Weiter */}
      <button
        onClick={handleStart}
        disabled={submitting || !selectedInsurance}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        style={{ minHeight: "48px" }}
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Weiter
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  );
}
