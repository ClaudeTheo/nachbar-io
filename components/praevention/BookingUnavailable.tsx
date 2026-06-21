// components/praevention/BookingUnavailable.tsx
// Nachbar.io — Ehrlicher Hinweis statt toter Buchungs-Sackgasse.
// Wird angezeigt, wenn BILLING_ENABLED aus ist: so fuellt der Nutzer kein
// Formular aus, das am Ende im 503 'Feature in Vorbereitung' endet.
"use client";

import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

export function BookingUnavailable() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention"
          aria-label="Zurueck zur Kursuebersicht"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Kurs buchen</h1>
      </div>

      {/* Ehrlicher Hinweis */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="mb-3 flex items-center gap-2 text-emerald-700">
          <Info className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            Online-Buchung noch nicht verfügbar
          </h2>
        </div>
        <p className="text-base text-gray-700">
          Die Bezahlung über die App ist gerade in Vorbereitung. In der
          Pilotphase sind die Präventionskurse für Sie kostenlos — Sie können
          sich direkt über die Kursübersicht anmelden.
        </p>
      </div>

      {/* Weg zum funktionierenden, kostenlosen Pfad */}
      <Link
        href="/praevention"
        className="mt-6 block w-full rounded-xl bg-emerald-600 px-6 py-3 text-center text-base font-medium text-white transition-colors hover:bg-emerald-700"
        style={{ minHeight: "48px" }}
      >
        Zur Kursübersicht
      </Link>
    </div>
  );
}
