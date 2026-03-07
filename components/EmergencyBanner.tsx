"use client";

import { Phone } from "lucide-react";

/**
 * KRITISCHE KOMPONENTE: EmergencyBanner
 *
 * Zeigt den Notruf-Hinweis bei lebensbedrohlichen Situationen.
 * Muss IMMER angezeigt werden BEVOR andere Aktionen möglich sind.
 *
 * Regel: Bei Feuer, medizinischem Notfall oder Einbruch → 112/110 zuerst.
 * Diese Regel ist NICHT verhandelbar.
 */

interface EmergencyBannerProps {
  onAcknowledge: () => void;
}

export function EmergencyBanner({ onAcknowledge }: EmergencyBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        {/* Roter Notfall-Header */}
        <div className="mb-4 rounded-lg bg-emergency-red p-4 text-center text-white">
          <Phone className="mx-auto mb-2 h-10 w-10" aria-hidden="true" />
          <h2 className="text-xl font-bold">Notruf zuerst!</h2>
        </div>

        {/* Notrufnummern */}
        <div className="mb-6 space-y-3">
          <a
            href="tel:112"
            className="flex items-center justify-center gap-3 rounded-lg border-2 border-emergency-red p-4 text-lg font-bold text-emergency-red transition-colors hover:bg-red-50"
          >
            <Phone className="h-6 w-6" />
            112 — Feuerwehr / Rettungsdienst
          </a>
          <a
            href="tel:110"
            className="flex items-center justify-center gap-3 rounded-lg border-2 border-emergency-red p-4 text-lg font-bold text-emergency-red transition-colors hover:bg-red-50"
          >
            <Phone className="h-6 w-6" />
            110 — Polizei
          </a>
        </div>

        {/* Hinweistext */}
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Bitte rufen Sie bei einem Notfall <strong>immer zuerst</strong> den
          offiziellen Notruf an. Diese App ist kein Ersatz für
          Rettungsdienste.
        </p>

        {/* Weiter-Button */}
        <button
          onClick={onAcknowledge}
          className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-50"
        >
          Ich habe den Notruf verständigt — Nachbarn zusätzlich informieren
        </button>
      </div>
    </div>
  );
}
