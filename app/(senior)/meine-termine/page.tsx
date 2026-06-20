// app/(senior)/meine-termine/page.tsx
// Welle F3-Folge (Befund C2:5): "Termine" in der Senior-Shell. Bisher fuehrte der
// kreis-start-"Termine"-Link auf /mein-kreis/termine in der (app)-Shell — der Senior
// verlor dort den dauerhaften 112-Footer und die grosse Senior-Schrift. Diese Seite
// rendert dieselben kommenden Termine innerhalb der (senior)-Shell. Datenweg:
// useCircleEvents ist RLS-scoped auf die eigenen circle_events des Bewohners
// (resident_id === eigener User) — keine neue Datenfläche.
// Route /meine-termine statt /termine: /termine waere Substring von
// /mein-kreis/termine und wuerde Glob-basierte Navigationspruefungen verwirren.
"use client";

import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { useCircleEvents } from "@/lib/care/hooks/useCircleEvents";
import type { CircleEvent } from "@/lib/services/circle-events.service";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time} Uhr`;
}

function TerminCard({ event }: { event: CircleEvent }) {
  return (
    <li className="rounded-2xl border-2 border-anthrazit/20 bg-white p-6">
      <div className="flex items-start gap-3">
        <Calendar className="mt-1 h-7 w-7 flex-shrink-0 text-quartier-green" />
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight text-anthrazit">
            {event.title}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xl text-anthrazit">
            <Clock className="h-5 w-5 flex-shrink-0" />
            {formatWhen(event.scheduled_at)}
          </p>
          {event.who_comes && (
            <p className="mt-2 text-lg text-anthrazit/80">
              Wer kommt: {event.who_comes}
            </p>
          )}
          {event.description && (
            <p className="mt-1 text-lg text-anthrazit/80">
              {event.description}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function SeniorMeineTerminePage() {
  const { events, loading, error } = useCircleEvents();

  return (
    <section aria-label="Meine Termine" className="space-y-6">
      <Link
        href="/kreis-start"
        className="inline-flex items-center rounded-2xl border-2 border-anthrazit/20 bg-white px-5 text-lg font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
        style={{ minHeight: "56px", touchAction: "manipulation" }}
      >
        &larr; Zur Startseite
      </Link>

      <h1 className="text-3xl font-bold text-anthrazit">Meine Termine</h1>

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

      {!loading && !error && events.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-anthrazit/20 bg-white p-8 text-center">
          <p className="text-2xl font-semibold text-anthrazit">
            Keine Termine geplant.
          </p>
          <p className="mt-2 text-lg text-anthrazit/80">
            Sobald Ihre Familie einen Termin einträgt, sehen Sie ihn hier.
          </p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <ul className="space-y-4">
          {events.map((evt) => (
            <TerminCard key={evt.id} event={evt} />
          ))}
        </ul>
      )}
    </section>
  );
}
