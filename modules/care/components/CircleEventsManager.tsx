// modules/care/components/CircleEventsManager.tsx
// Welle F3 (Befund C2:5): Angehoerigen-Seite des Familienkalenders. Bisher war
// "Termine" eine Einbahnstrasse — nur der Bewohner (bzw. der im Pilot tote
// Voice-Flow) konnte schreiben, der Angehoerige sah/schrieb nichts. Diese
// Komponente laesst den Angehoerigen Besuche/Termine fuer den Bewohner anlegen
// und die kommenden Termine sehen. Datenweg: listUpcoming + POST
// /api/circle-events (residentId), beides RLS-scoped auf aktive caregiver_links.
"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listUpcoming,
  type CircleEvent,
} from "@/lib/services/circle-events.service";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CircleEventsManager({
  residentId,
  residentName,
}: {
  residentId: string;
  residentName: string;
}) {
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scheduledAt, setScheduledAt] = useState("");
  const [title, setTitle] = useState("");
  const [whoComes, setWhoComes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      setEvents(await listUpcoming(supabase, residentId));
    } catch {
      setError("Termine konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/circle-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId, scheduledAt, title, whoComes }),
      });
      if (!res.ok) {
        setError("Termin konnte nicht angelegt werden.");
        setSubmitting(false);
        return;
      }
      setTitle("");
      setScheduledAt("");
      setWhoComes("");
      await load();
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="circle-events-manager">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-anthrazit">
        <CalendarPlus className="h-5 w-5 text-quartier-green" />
        Termine im Kreis
      </h3>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Anlegen */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div>
          <label
            htmlFor="ce-when"
            className="mb-1 block text-sm font-medium text-anthrazit"
          >
            Wann
          </label>
          <input
            id="ce-when"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="ce-title"
            className="mb-1 block text-sm font-medium text-anthrazit"
          >
            Was
          </label>
          <input
            id="ce-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Besuch, Arzttermin, Geburtstag"
            maxLength={200}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="ce-who"
            className="mb-1 block text-sm font-medium text-anthrazit"
          >
            Wer kommt (optional)
          </label>
          <input
            id="ce-who"
            type="text"
            value={whoComes}
            onChange={(e) => setWhoComes(e.target.value)}
            placeholder="z. B. Maria"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2 text-sm font-semibold text-white hover:bg-quartier-green/90 disabled:opacity-60"
        >
          {submitting ? "Wird angelegt …" : `Termin für ${residentName} ankündigen`}
        </button>
      </form>

      {/* Kommende Termine */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      ) : events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
          Noch keine kommenden Termine.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="circle-events-list">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-xl border border-gray-200 bg-white p-3"
            >
              <p className="text-sm font-semibold text-anthrazit">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatWhen(ev.scheduled_at)}
                {ev.who_comes ? ` · ${ev.who_comes}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
