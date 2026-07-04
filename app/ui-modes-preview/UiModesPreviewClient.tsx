"use client";

import Link from "next/link";

import {
  GenerationModeMatrix,
  ModeComparisonPreview,
  UserModePreviewStack,
} from "@/components/modes/UserModeSurface";

export function UiModesPreviewClient() {
  return (
    <main className="min-h-screen bg-warmwhite px-4 py-6 text-anthrazit md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-anthrazit/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-quartier-green">
              Generation Design V2
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              Erwachsene zuerst, Jugend als Prototyp
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Lokale Preview fuer Aktiv, Aktiv 55+, Einfach und die geparkte
              Jugend-Arcade-Quest. Echte Routen bleiben hinter dem Feature-Flag.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-anthrazit/15 bg-white px-4 text-sm font-semibold"
          >
            Zum Dashboard
          </Link>
        </header>

        <section aria-label="Generation Design Matrix" className="space-y-3">
          <h2 className="text-lg font-semibold">Verbindliche Modus-Matrix</h2>
          <GenerationModeMatrix />
        </section>

        <section aria-label="Modusvergleich" className="space-y-3">
          <h2 className="text-lg font-semibold">Auswahlkarten</h2>
          <ModeComparisonPreview />
        </section>

        <section aria-label="Dashboard-Fokusleisten" className="space-y-3">
          <h2 className="text-lg font-semibold">Dashboard-Fokusleisten</h2>
          <UserModePreviewStack />
        </section>
      </div>
    </main>
  );
}
