"use client";

import { useState, useEffect } from "react";
import {
  canAccessBilling,
  getSubscriptionLabel,
} from "@/modules/hilfe/services/feature-gate";
import type { SubscriptionStatus } from "@/modules/hilfe/services/types";

type SubscriptionData = {
  subscription_status: SubscriptionStatus;
  trial_receipt_used: boolean;
  subscription_paused_at: string | null;
  subscription_cancelled_at: string | null;
};

type NoticeTone = "success" | "info" | "warning" | "error";

type NoticeState = {
  tone: NoticeTone;
  title: string;
  description: string;
};

const NOTICE_STYLES: Record<NoticeTone, string> = {
  success: "border-green-200 bg-green-50 text-green-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

function formatGermanDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Leere oder nicht-json Antwort -> Fallback
  }

  return fallback;
}

export default function SubscriptionManager() {
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    void initializePage();
  }, []);

  async function initializePage() {
    const currentSubscription = await loadSubscription({ showSkeleton: true });

    const params = new URLSearchParams(window.location.search);
    const checkoutSucceeded = params.get("success") === "true";
    const checkoutCancelled = params.get("cancelled") === "true";

    if (checkoutSucceeded || checkoutCancelled) {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("cancelled");
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", nextUrl || url.pathname);
    }

    if (checkoutSucceeded) {
      await syncCheckoutState(currentSubscription);
      return;
    }

    if (checkoutCancelled) {
      setNotice({
        tone: "warning",
        title: "Checkout abgebrochen",
        description:
          "Ihr Helfer-Profil bleibt bestehen. Sie koennen die Aktivierung jederzeit erneut starten.",
      });
    }
  }

  async function loadSubscription(options?: {
    showSkeleton?: boolean;
  }): Promise<SubscriptionData | null> {
    const showSkeleton = options?.showSkeleton ?? false;

    if (showSkeleton) setLoading(true);

    try {
      const res = await fetch("/api/hilfe/subscription", { cache: "no-store" });

      if (!res.ok) {
        const message = await readErrorMessage(
          res,
          "Der Abo-Status konnte gerade nicht geladen werden.",
        );
        setLoadError(message);
        return sub;
      }

      const data = (await res.json()) as SubscriptionData | null;
      setSub(data);
      setLoadError(null);
      return data;
    } catch {
      setLoadError("Der Abo-Status konnte gerade nicht geladen werden.");
      return sub;
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }

  async function syncCheckoutState(currentSubscription: SubscriptionData | null) {
    if (currentSubscription?.subscription_status === "active") {
      setNotice({
        tone: "success",
        title: "Abrechnungs-Modul aktiviert",
        description:
          "Ihr Abo ist aktiv. Sie koennen jetzt Quittungen, Monatsberichte und den Budget-Tracker nutzen.",
      });
      return;
    }

    setSyncingCheckout(true);
    setNotice({
      tone: "info",
      title: "Zahlung erfolgreich",
      description:
        "Ihre Aktivierung wird gerade bestaetigt. Das dauert normalerweise nur ein paar Sekunden.",
    });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const refreshedSubscription = await loadSubscription();

      if (refreshedSubscription?.subscription_status === "active") {
        setNotice({
          tone: "success",
          title: "Abrechnungs-Modul aktiviert",
          description:
            "Ihr Abo ist jetzt aktiv. Sie koennen direkt mit Quittungen und Monatsberichten starten.",
        });
        setSyncingCheckout(false);
        return;
      }
    }

    setNotice({
      tone: "info",
      title: "Aktivierung laeuft noch",
      description:
        "Die Zahlung ist eingegangen. Falls Ihr Status noch nicht umspringt, laden Sie die Seite gleich noch einmal.",
    });
    setSyncingCheckout(false);
  }

  async function startCheckout() {
    setActionLoading(true);
    setNotice(null);

    try {
      const res = await fetch("/api/hilfe/checkout", { method: "POST" });
      if (!res.ok) {
        const message = await readErrorMessage(
          res,
          "Der Checkout konnte nicht gestartet werden.",
        );
        setNotice({
          tone: "error",
          title: "Checkout nicht verfuegbar",
          description: message,
        });
        return;
      }

      const { url } = (await res.json()) as { url?: string | null };
      if (!url) {
        setNotice({
          tone: "error",
          title: "Checkout nicht verfuegbar",
          description:
            "Es wurde keine Zahlungsseite zurueckgegeben. Bitte versuchen Sie es erneut.",
        });
        return;
      }

      window.location.assign(url);
    } catch {
      setNotice({
        tone: "error",
        title: "Checkout nicht verfuegbar",
        description:
          "Die Zahlungsseite konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAction(action: "pause" | "resume" | "cancel") {
    setActionLoading(true);
    setNotice(null);

    try {
      const res = await fetch("/api/hilfe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const message = await readErrorMessage(
          res,
          "Die Abo-Aktion konnte nicht gespeichert werden.",
        );
        setNotice({
          tone: "error",
          title: "Aenderung fehlgeschlagen",
          description: message,
        });
        return;
      }

      await loadSubscription();

      const actionMessages: Record<
        "pause" | "resume" | "cancel",
        NoticeState
      > = {
        pause: {
          tone: "success",
          title: "Abo pausiert",
          description:
            "Ihr Abrechnungs-Modul ist pausiert. Sie koennen es jederzeit wieder aktivieren.",
        },
        resume: {
          tone: "success",
          title: "Abo fortgesetzt",
          description:
            "Ihr Abrechnungs-Modul steht wieder uneingeschraenkt zur Verfuegung.",
        },
        cancel: {
          tone: "warning",
          title: "Kuendigung vorgemerkt",
          description:
            "Ihr Abo endet zum Ende des laufenden Abrechnungszeitraums.",
        },
      };

      setNotice(actionMessages[action]);
    } catch {
      setNotice({
        tone: "error",
        title: "Aenderung fehlgeschlagen",
        description:
          "Die Abo-Aktion konnte gerade nicht abgeschlossen werden. Bitte versuchen Sie es erneut.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading)
    return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
  if (loadError && !sub)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-red-900">
            Abo-Status gerade nicht erreichbar
          </h3>
          <p className="text-sm text-red-700 mt-1">{loadError}</p>
        </div>
        <button
          onClick={() => void loadSubscription({ showSkeleton: true })}
          className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-900 border border-red-200"
        >
          Erneut versuchen
        </button>
      </div>
    );
  if (!sub)
    return (
      <div className="rounded-2xl border border-gray-200 p-6 text-center space-y-4">
        <div className="text-4xl">🤝</div>
        <h3 className="font-semibold text-gray-900">
          Noch kein Helfer-Profil vorhanden
        </h3>
        <p className="text-sm text-gray-500">
          Um das Abrechnungs-Modul nutzen zu können, registrieren Sie sich
          zuerst als Nachbarschaftshelfer.
        </p>
        <a
          href="/hilfe/helfer-werden"
          className="inline-block rounded-xl bg-[#4CAF87] px-6 py-3 text-white font-semibold
                     min-h-[52px] leading-[52px] active:scale-[0.98] transition-transform"
        >
          Jetzt Helfer werden
        </a>
      </div>
    );

  const canUseBilling = canAccessBilling(
    sub.subscription_status,
    sub.trial_receipt_used,
  );
  const pausedAtLabel = formatGermanDate(sub.subscription_paused_at);
  const cancelledAtLabel = formatGermanDate(sub.subscription_cancelled_at);

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`rounded-2xl border p-4 ${NOTICE_STYLES[notice.tone]}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          <p className="font-semibold">{notice.title}</p>
          <p className="text-sm mt-1">{notice.description}</p>
        </div>
      )}

      {sub.subscription_status !== "active" && (
        <div className="rounded-2xl border border-[#cfe7da] bg-[#f4fbf7] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#2d6a4f]">
                Pflegekassen-Abrechnung fuer Nachbarschaftshilfe
              </p>
              <div>
                <p className="text-3xl font-bold text-gray-900">19,90 EUR</p>
                <p className="text-sm text-gray-600">pro Monat, jederzeit pausierbar</p>
              </div>
              <p className="text-sm text-gray-600 max-w-2xl">
                Digitale Quittungen, Sammelberichte und ein klarer Budget-Ueberblick
                fuer die Abrechnung mit der Pflegekasse.
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 border border-white/80 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Einstieg
              </p>
              <p className="font-semibold text-gray-900">
                1 Quittung kostenlos testen
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "Pflegekassenkonforme PDFs ohne Nachbearbeitung",
              "Monatsberichte und Budget-Tracker an einem Ort",
              "Jederzeit pausierbar oder kuendbar",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 border border-white/80"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aktueller Status */}
      <div className="rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Ihr Abo-Status</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              sub.subscription_status === "active"
                ? "bg-green-100 text-green-700"
                : sub.subscription_status === "trial"
                  ? "bg-blue-100 text-blue-700"
                  : sub.subscription_status === "paused"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {getSubscriptionLabel(sub.subscription_status)}
          </span>
        </div>

        {pausedAtLabel && sub.subscription_status === "paused" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-4 mb-4">
            Ihr Abo ist seit dem {pausedAtLabel} pausiert.
          </p>
        )}

        {cancelledAtLabel && sub.subscription_status === "cancelled" && (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-4 mb-4">
            Ihr Abo ist noch bis zum {cancelledAtLabel} vorgemerkt.
          </p>
        )}

        {/* Trial Info */}
        {sub.subscription_status === "trial" && !sub.trial_receipt_used && (
          <p className="text-sm text-blue-600 bg-blue-50 rounded-xl p-4">
            Sie können eine Quittung kostenlos erstellen. Danach wird das
            Abrechnungs-Modul kostenpflichtig (19,90 EUR/Monat).
          </p>
        )}

        {/* Checkout Button */}
        {(sub.subscription_status === "free" ||
          (sub.subscription_status === "trial" && sub.trial_receipt_used) ||
          sub.subscription_status === "cancelled") && (
          <button
            onClick={startCheckout}
            disabled={actionLoading || syncingCheckout}
            className="w-full rounded-xl bg-[#4CAF87] px-6 py-4 text-white font-semibold text-base
                       min-h-[52px] disabled:opacity-50 active:scale-[0.98] transition-transform mt-4"
          >
            {actionLoading || syncingCheckout
              ? syncingCheckout
                ? "Aktivierung wird geprueft..."
                : "Wird geladen..."
              : "Abrechnungs-Modul aktivieren (19,90 EUR/Mo)"}
          </button>
        )}

        {/* Abo-Verwaltung */}
        {sub.subscription_status === "active" && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleAction("pause")}
              disabled={actionLoading}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-600
                         min-h-[52px] disabled:opacity-50"
            >
              Pausieren
            </button>
            <button
              onClick={() => handleAction("cancel")}
              disabled={actionLoading}
              className="rounded-xl border border-red-200 px-4 py-3 text-red-500
                         min-h-[52px] disabled:opacity-50"
            >
              Kuendigen
            </button>
          </div>
        )}

        {sub.subscription_status === "paused" && (
          <button
            onClick={() => handleAction("resume")}
            disabled={actionLoading}
            className="w-full rounded-xl bg-[#4CAF87] px-6 py-4 text-white font-semibold
                       min-h-[52px] disabled:opacity-50 mt-4"
          >
            Abo fortsetzen
          </button>
        )}
      </div>

      {canUseBilling && (
        <div className="rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            Was Sie jetzt direkt erledigen koennen
          </h3>
          <p className="text-sm text-gray-600">
            Nutzen Sie Ihr aktives Abrechnungs-Modul direkt weiter, statt nur den
            Status zu verwalten.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <a
              href="/hilfe/verbindungen"
              className="rounded-2xl border border-gray-200 px-4 py-4 transition-colors hover:border-[#4CAF87] hover:bg-[#f4fbf7]"
            >
              <p className="font-semibold text-gray-900">
                Verbindungen verwalten
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Bewohner anbinden und bestaetigte Helferbeziehungen pflegen.
              </p>
            </a>
            <a
              href="/hilfe/budget"
              className="rounded-2xl border border-gray-200 px-4 py-4 transition-colors hover:border-[#4CAF87] hover:bg-[#f4fbf7]"
            >
              <p className="font-semibold text-gray-900">Budget im Blick behalten</p>
              <p className="text-sm text-gray-600 mt-1">
                Verfuegbares Monatsbudget und bereits dokumentierte Einsaetze sehen.
              </p>
            </a>
          </div>
        </div>
      )}

      {/* Leistungsübersicht */}
      <div className="rounded-2xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Was ist enthalten?</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Einsatz-Dokumentation",
            "Digitale Unterschrift (Senior + Helfer)",
            "PDF-Quittung (pflegekassenkonform)",
            "Sammelabrechnung (monatlich)",
            "Budget-Tracker (131 EUR/Monat)",
            "E-Mail-Versand an Pflegekasse",
            "Verbindung mit Senioren",
            "Jederzeit kündbar oder pausierbar",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-[#4CAF87] mt-0.5">&#10003;</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
