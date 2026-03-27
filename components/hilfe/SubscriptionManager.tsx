"use client";

import { useState, useEffect } from "react";
import { getSubscriptionLabel } from "@/lib/hilfe/feature-gate";
import type { SubscriptionStatus } from "@/lib/hilfe/types";

export default function SubscriptionManager() {
  const [sub, setSub] = useState<{
    subscription_status: SubscriptionStatus;
    trial_receipt_used: boolean;
    subscription_paused_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const res = await fetch("/api/hilfe/subscription");
    if (res.ok) setSub(await res.json());
    setLoading(false);
  }

  async function startCheckout() {
    setActionLoading(true);
    const res = await fetch("/api/hilfe/checkout", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
    setActionLoading(false);
  }

  async function handleAction(action: "pause" | "resume" | "cancel") {
    setActionLoading(true);
    await fetch("/api/hilfe/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadSubscription();
    setActionLoading(false);
  }

  if (loading)
    return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
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

  return (
    <div className="space-y-6">
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
            disabled={actionLoading}
            className="w-full rounded-xl bg-[#4CAF87] px-6 py-4 text-white font-semibold text-base
                       min-h-[52px] disabled:opacity-50 active:scale-[0.98] transition-transform mt-4"
          >
            {actionLoading
              ? "Wird geladen..."
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
