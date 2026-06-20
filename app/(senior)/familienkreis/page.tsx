// app/(senior)/familienkreis/page.tsx
// Welle F2 (Befund C2:2/C2:4): "Mein Kreis" in der Senior-Shell. Bisher fuehrte
// die zentrale kreis-start-Kachel auf /mein-kreis in der (app)-Shell — der Senior
// verlor dort die 80px-Touch-Targets und den dauerhaften 112-Footer. Diese Seite
// rendert die Gegenrichtung (verbundene Angehoerige als grosse Kacheln mit
// Nachricht/Anruf) innerhalb der (senior)-Shell. Datenweg: useMyCaregivers ist
// RLS-scoped auf die eigenen caregiver_links des Bewohners.
// Route /familienkreis statt /kreis: /kreis waere ein Praefix von /kreis-start
// und wuerde Glob-basierte Navigationspruefungen (waitForURL) kollidieren lassen.
"use client";

import Link from "next/link";
import { useMyCaregivers } from "@/modules/care/hooks/useMyCaregivers";
import { MyCaregiversList } from "@/modules/care/components/senior/MyCaregiversList";

export default function SeniorFamilienkreisPage() {
  const { caregivers, loading, error } = useMyCaregivers();

  return (
    <section aria-label="Mein Kreis" className="space-y-6">
      <Link
        href="/kreis-start"
        className="inline-flex items-center rounded-2xl border-2 border-anthrazit/20 bg-white px-5 text-lg font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
        style={{ minHeight: "56px", touchAction: "manipulation" }}
      >
        &larr; Zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-anthrazit">Mein Kreis</h1>

      {loading && (
        <p className="text-xl text-anthrazit" role="status" aria-live="polite">
          Wird geladen …
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl border-2 border-red-600 bg-red-50 px-6 py-5 text-xl font-bold text-anthrazit"
        >
          Das hat leider nicht geklappt. Bitte später noch einmal.
        </p>
      )}

      {!loading && !error && caregivers.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-anthrazit/20 bg-white p-8 text-center">
          <p className="text-2xl font-semibold text-anthrazit">
            Noch niemand in Ihrem Kreis.
          </p>
          <p className="mt-2 text-lg text-anthrazit/80">
            Ihre Familie kann sich mit Ihnen verbinden, dann erscheint sie hier.
          </p>
        </div>
      )}

      {!loading && !error && caregivers.length > 0 && (
        <MyCaregiversList caregivers={caregivers} large />
      )}
    </section>
  );
}
