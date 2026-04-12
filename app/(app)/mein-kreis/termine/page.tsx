// app/(app)/mein-kreis/termine/page.tsx
// Phase 1 Task E-3: Termine im Familienkreis
// Drei Sektionen: Heute, Diese Woche, Spaeter
"use client";

import { Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { useCircleEvents } from "@/lib/care/hooks/useCircleEvents";
import type { CircleEvent } from "@/lib/services/circle-events.service";

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isThisWeek(date: Date, now: Date): boolean {
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  return date <= endOfWeek && !isSameDay(date, now);
}

function groupEvents(events: CircleEvent[]) {
  const now = new Date();
  const today: CircleEvent[] = [];
  const thisWeek: CircleEvent[] = [];
  const later: CircleEvent[] = [];

  for (const evt of events) {
    const d = new Date(evt.scheduled_at);
    if (isSameDay(d, now)) {
      today.push(evt);
    } else if (isThisWeek(d, now)) {
      thisWeek.push(evt);
    } else {
      later.push(evt);
    }
  }

  return { today, thisWeek, later };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventCard({ event }: { event: CircleEvent }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <Calendar className="h-5 w-5 text-quartier-green" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-anthrazit">{event.title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formatDate(event.scheduled_at)}, {formatTime(event.scheduled_at)}
          </span>
        </div>
        {event.who_comes && (
          <p className="text-sm text-muted-foreground mt-1">
            Wer kommt: {event.who_comes}
          </p>
        )}
        {event.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, events }: { title: string; events: CircleEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
      {events.map((evt) => (
        <EventCard key={evt.id} event={evt} />
      ))}
    </div>
  );
}

export default function TerminePage() {
  const { events, loading, error } = useCircleEvents();

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const { today, thisWeek, later } = groupEvents(events);

  return (
    <div className="px-4 py-6 space-y-6">
      <PageHeader
        title={
          <>
            <Calendar className="h-6 w-6 text-quartier-green" /> Termine
          </>
        }
        subtitle="Ihre naechsten Termine im Kreis"
        backHref="/mein-kreis"
        backLabel="Mein Kreis"
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && events.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium text-anthrazit">
            Keine Termine geplant
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Sie koennen ueber &quot;Schreiben&quot; einen Termin mit jemandem
            aus Ihrem Kreis vereinbaren.
          </p>
          <Link
            href="/schreiben"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white hover:bg-quartier-green/90"
          >
            Nachricht schreiben
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <Section title="Heute" events={today} />
      <Section title="Diese Woche" events={thisWeek} />
      <Section title="Spaeter" events={later} />
    </div>
  );
}
