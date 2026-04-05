"use client";

import { CheckCircle2, Bell, CalendarDays, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ErstattungFertigPage() {
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
          <h1 className="text-2xl font-bold text-gray-900">Geschafft!</h1>
          <p className="text-sm text-gray-500">Schritt 4 von 4</p>
        </div>
      </div>

      {/* Erfolg */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          Erstattung eingereicht
        </h2>
        <p className="text-gray-600">
          Ihre Krankenkasse wird die Erstattung in der Regel innerhalb von 2-4
          Wochen bearbeiten.
        </p>
      </div>

      {/* Naechste Schritte */}
      <div className="mb-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Nächste Schritte
        </h3>

        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <Bell className="mt-0.5 h-5 w-5 text-emerald-500" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Erinnerung aktiviert
            </h4>
            <p className="text-xs text-gray-500">
              Wir erinnern Sie, falls nach 4 Wochen noch keine Erstattung
              eingegangen ist.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 text-emerald-500" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Erstattung bestätigen
            </h4>
            <p className="text-xs text-gray-500">
              Sobald die Erstattung auf Ihrem Konto eingegangen ist, können Sie
              dies in Ihrem Profil bestätigen.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Link
          href="/praevention"
          className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white hover:bg-emerald-700"
          style={{ minHeight: "48px" }}
        >
          Zur Kursübersicht
        </Link>
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
          style={{ minHeight: "48px" }}
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
