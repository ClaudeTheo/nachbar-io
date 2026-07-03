"use client";

// app/(senior)/error.tsx
// W7 (Befund A3:6): Fehlerseite fuer die (senior)-Routengruppe.
// Grosse Schrift, ruhige einfache Sprache, ein grosser Neu-laden-Knopf.
// Das (senior)-Layout bleibt bei einem Page-Fehler stehen — die rote
// 112-Leiste unten ist also weiterhin sichtbar und funktioniert.

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function SeniorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Senior-Bereich Fehler:", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border-2 border-anthrazit/15 bg-white p-6 text-anthrazit">
      <h1 className="text-3xl font-bold">Das hat gerade nicht geklappt.</h1>
      <p className="text-xl leading-relaxed text-gray-700">
        Sie haben nichts falsch gemacht. Bitte tippen Sie auf
        &bdquo;Neu laden&ldquo;. Wenn das nicht hilft, warten Sie einen Moment
        und versuchen es dann noch einmal.
      </p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center justify-center gap-3 rounded-2xl bg-quartier-green px-6 text-2xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
        style={{ minHeight: "80px", touchAction: "manipulation" }}
      >
        <RefreshCw className="h-7 w-7" aria-hidden="true" />
        Neu laden
      </button>
      <p className="text-xl leading-relaxed text-gray-700">
        Der Notruf 112 unten funktioniert immer — auch wenn diese Seite
        gerade nicht lädt.
      </p>
    </div>
  );
}
