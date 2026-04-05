"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Globe,
  Mail,
  Package,
  Users,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface InsuranceConfig {
  id: string;
  name: string;
  short_name: string;
  submission_type: string;
  submission_url: string | null;
  instructions: string;
}

const METHOD_ICONS: Record<string, typeof Smartphone> = {
  app_link: Smartphone,
  web_upload: Globe,
  email: Mail,
  postal: Package,
};

const METHOD_LABELS: Record<string, string> = {
  app_link: "Kassen-App",
  web_upload: "Online-Portal",
  email: "Per E-Mail",
  postal: "Per Post",
};

export default function EinreichenPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const enrollmentId = searchParams.get("enrollment") || "";

  const [insurance, setInsurance] = useState<InsuranceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsurance();
  }, []);

  async function loadInsurance() {
    try {
      // Enrollment laden um insurance_config_id zu bekommen
      const progressRes = await fetch("/api/prevention/progress");
      if (!progressRes.ok) return;

      const progressData = await progressRes.json();
      const enrollment = progressData.find(
        (p: { enrollment: { id: string } }) => p.enrollment.id === enrollmentId,
      )?.enrollment;

      if (!enrollment?.insurance_config_id) {
        setLoading(false);
        return;
      }

      // Alle Kassen laden und filtern
      const insRes = await fetch("/api/prevention/insurance-configs");
      if (insRes.ok) {
        const configs = await insRes.json();
        const match = configs.find(
          (c: InsuranceConfig) => c.id === enrollment.insurance_config_id,
        );
        if (match) setInsurance(match);
      }
    } catch {
      setError("Daten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(method: string) {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/prevention/reimbursement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, method }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      router.push(`/praevention/erstattung/fertig?enrollment=${enrollmentId}`);
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssist() {
    try {
      await fetch("/api/prevention/reimbursement/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      });
      alert(
        "Ihre Angehörigen wurden benachrichtigt und können Ihnen bei der Einreichung helfen.",
      );
    } catch {
      alert("Benachrichtigung konnte nicht gesendet werden.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  const Icon = insurance
    ? METHOD_ICONS[insurance.submission_type] || Globe
    : Globe;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/praevention/erstattung/bescheinigung?enrollment=${enrollmentId}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einreichen</h1>
          <p className="text-sm text-gray-500">Schritt 3 von 4</p>
        </div>
      </div>

      {/* Kassenspezifische Anleitung */}
      {insurance ? (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-semibold text-emerald-800">
              {insurance.name} — {METHOD_LABELS[insurance.submission_type]}
            </h3>
          </div>
          <p className="text-sm text-emerald-700">{insurance.instructions}</p>

          {insurance.submission_url && (
            <a
              href={insurance.submission_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 underline"
            >
              Link öffnen
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Reichen Sie die Bescheinigung bei Ihrer Krankenkasse ein. Die
            meisten Kassen akzeptieren Einreichungen per App, Online-Portal,
            E-Mail oder Post.
          </p>
        </div>
      )}

      {/* Methode bestaetigen */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          Wie haben Sie eingereicht?
        </h3>
        <div className="space-y-2">
          {Object.entries(METHOD_LABELS).map(([method, label]) => {
            const MethodIcon = METHOD_ICONS[method] || Globe;
            return (
              <button
                key={method}
                onClick={() =>
                  handleSubmit(
                    method === "app_link"
                      ? "app_upload"
                      : method === "web_upload"
                        ? "web_upload"
                        : method,
                  )
                }
                disabled={submitting}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                style={{ minHeight: "48px" }}
              >
                <MethodIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  {label}
                </span>
                {submitting && (
                  <Loader2 className="ml-auto h-4 w-4 animate-spin text-gray-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hilfe von Angehoerigen */}
      <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <h3 className="mb-1 text-sm font-semibold text-amber-800">
          Brauchen Sie Hilfe?
        </h3>
        <p className="mb-3 text-sm text-amber-700">
          Ein Angehöriger kann Ihnen beim Einreichen helfen.
        </p>
        <button
          onClick={handleAssist}
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-50"
          style={{ minHeight: "44px" }}
        >
          <Users className="h-4 w-4" />
          Angehörigen benachrichtigen
        </button>
      </div>

      {/* Fehler */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
