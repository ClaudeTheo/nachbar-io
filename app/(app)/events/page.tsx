"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Filter, ChevronRight, MapPin, Clock, Users, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { EVENT_CATEGORIES } from "@/lib/constants";
import type { Event } from "@/lib/supabase/types";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function load() {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("events")
        .select("*, user:users(display_name, avatar_url)")
        .eq("quarter_id", currentQuarter!.id)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (data) {
        const typedEvents = data as unknown as Event[];
        const eventIds = typedEvents.map((e) => e.id);

        // Alle Teilnehmer-Counts in einer einzigen Abfrage laden (statt N+1)
        const { data: countData } = eventIds.length > 0
          ? await supabase
              .from("event_participants")
              .select("event_id")
              .in("event_id", eventIds)
              .eq("status", "going")
          : { data: [] };

        const countMap = new Map<string, number>();
        for (const row of countData ?? []) {
          countMap.set(row.event_id, (countMap.get(row.event_id) ?? 0) + 1);
        }

        const eventsWithCounts = typedEvents.map((event) => ({
          ...event,
          participant_count: countMap.get(event.id) ?? 0,
        }));
        setEvents(eventsWithCounts);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuarter?.id]);

  const filteredEvents = filterCategory
    ? events.filter((e) => e.category === filterCategory)
    : events;

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-anthrazit">Veranstaltungen</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`rounded-lg p-2 transition-colors ${
              filterCategory ? "bg-quartier-green/10 text-quartier-green" : "hover:bg-muted"
            }`}
            aria-label="Filter"
          >
            <Filter className="h-4 w-4" />
          </button>
          <Link
            href="/events/new"
            className="flex items-center gap-1 rounded-lg bg-quartier-green px-3 py-2 text-sm font-semibold text-white hover:bg-quartier-green-dark"
          >
            <Plus className="h-4 w-4" />
            Neues Event
          </Link>
        </div>
      </div>

      {/* Kategorie-Filter */}
      {showFilter && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !filterCategory
                ? "bg-quartier-green text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Alle
          </button>
          {EVENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filterCategory === cat.id
                  ? "bg-quartier-green text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Ladezustand */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {/* Leerer Zustand */}
      {!loading && filteredEvents.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-5xl">📅</div>
          <p className="mt-3 text-muted-foreground">
            {filterCategory
              ? "Keine Veranstaltungen in dieser Kategorie."
              : "Noch keine Veranstaltungen geplant."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Erstellen Sie die erste Veranstaltung in Ihrem Quartier!
          </p>
        </div>
      )}

      {/* Event-Liste */}
      {!loading && filteredEvents.length > 0 && (
        <div className="animate-stagger space-y-3">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// Hilfsfunktion: Datum schoen formatieren
function formatEventDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Heute";
  if (isTomorrow(date)) return "Morgen";
  return format(date, "EEE, d. MMMM", { locale: de });
}

function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const cat = EVENT_CATEGORIES.find((c) => c.id === event.category);
  const dateLabel = formatEventDate(event.event_date);

  return (
    <button
      onClick={() => router.push(`/events/${event.id}`)}
      className="card-interactive w-full rounded-lg border border-border bg-white p-4 shadow-soft text-left"
    >
      <div className="flex items-start gap-3">
        {/* Kategorie-Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10 text-2xl">
          {cat?.icon ?? "📅"}
        </div>

        {/* Inhalt */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-anthrazit truncate">{event.title}</h3>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateLabel}
            </span>
            {event.event_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {event.event_time.slice(0, 5)} Uhr
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {event.participant_count ?? 0} Teilnehmer
              {event.max_participants ? ` / ${event.max_participants}` : ""}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
      </div>
    </button>
  );
}
