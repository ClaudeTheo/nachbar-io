"use client";

import { useState, useEffect } from "react";
import { Calendar, Users, MapPin, Clock, Trash2, CheckCircle, XCircle, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { EVENT_CATEGORIES } from "@/lib/constants";
import type { Event, EventParticipant } from "@/lib/supabase/types";
import { format, parseISO, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";

export function EventManagement() {
  const [events, setEvents] = useState<(Event & { participant_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("events")
      .select("*, user:users(display_name, avatar_url)")
      .order("event_date", { ascending: true });

    if (data) {
      // Teilnehmeranzahl pro Event laden
      const eventsWithCounts = await Promise.all(
        (data as unknown as Event[]).map(async (event) => {
          const { count } = await supabase
            .from("event_participants")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id)
            .eq("status", "going");
          return { ...event, participant_count: count ?? 0 };
        })
      );
      setEvents(eventsWithCounts);
    }
    setLoading(false);
  }

  // Teilnehmer eines Events laden
  async function loadParticipants(eventId: string) {
    if (expandedId === eventId) {
      setExpandedId(null);
      return;
    }
    setLoadingParticipants(true);
    setExpandedId(eventId);
    const supabase = createClient();

    const { data } = await supabase
      .from("event_participants")
      .select("*, user:users(display_name, avatar_url)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (data) setParticipants(data as unknown as EventParticipant[]);
    setLoadingParticipants(false);
  }

  // Event loeschen
  async function deleteEvent(eventId: string) {
    const supabase = createClient();
    // Erst Teilnehmer loeschen, dann Event
    await supabase.from("event_participants").delete().eq("event_id", eventId);
    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      toast.error("Fehler beim Loeschen");
    } else {
      toast.success("Veranstaltung geloescht");
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  }

  // Filter anwenden
  const today = new Date().toISOString().split("T")[0];
  const filteredEvents = events.filter(e => {
    if (filter === "upcoming") return e.event_date >= today;
    if (filter === "past") return e.event_date < today;
    return true;
  });

  const upcomingCount = events.filter(e => e.event_date >= today).length;
  const pastCount = events.filter(e => e.event_date < today).length;
  const totalParticipants = events.reduce((sum, e) => sum + (e.participant_count ?? 0), 0);

  const catMap = new Map(EVENT_CATEGORIES.map(c => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          <h2 className="font-semibold text-anthrazit">Veranstaltungen</h2>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalParticipants} Anmeldungen
        </Badge>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-indigo-500">{upcomingCount}</p>
          <p className="text-[10px] text-muted-foreground">Anstehend</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{pastCount}</p>
          <p className="text-[10px] text-muted-foreground">Vergangen</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-quartier-green">{totalParticipants}</p>
          <p className="text-[10px] text-muted-foreground">Teilnehmer</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        <Button size="sm" variant={filter === "upcoming" ? "default" : "outline"} className="text-xs h-7" onClick={() => setFilter("upcoming")}>
          Anstehend ({upcomingCount})
        </Button>
        <Button size="sm" variant={filter === "past" ? "default" : "outline"} className="text-xs h-7" onClick={() => setFilter("past")}>
          Vergangen ({pastCount})
        </Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} className="text-xs h-7" onClick={() => setFilter("all")}>
          Alle ({events.length})
        </Button>
      </div>

      {/* Event-Liste */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Laden...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-muted-foreground">Keine Veranstaltungen gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((event) => {
            const cat = catMap.get(event.category);
            const isExpanded = expandedId === event.id;
            const eventIsPast = event.event_date < today;

            return (
              <Card key={event.id} className={`overflow-hidden ${eventIsPast ? "opacity-60" : ""}`}>
                <button
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/30"
                  onClick={() => loadParticipants(event.id)}
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xl">
                    {cat?.icon ?? "📅"}
                  </div>

                  {/* Inhalt */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-anthrazit text-sm truncate">{event.title}</p>
                      {eventIsPast && <Badge variant="secondary" className="text-[10px] h-4">Vergangen</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(event.event_date), "EEE, d. MMM", { locale: de })}
                      </span>
                      {event.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.event_time.slice(0, 5)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.participant_count} Teiln.
                        {event.max_participants ? ` / ${event.max_participants}` : ""}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Erstellt von {event.user?.display_name ?? "Unbekannt"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                      title="Event loeschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Teilnehmer-Details */}
                {isExpanded && (
                  <CardContent className="border-t bg-muted/10 p-3">
                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                    )}
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Teilnehmer ({participants.filter(p => p.status === "going").length} zusagen,{" "}
                      {participants.filter(p => p.status === "interested").length} interessiert)
                    </p>
                    {loadingParticipants ? (
                      <p className="text-xs text-muted-foreground">Laden...</p>
                    ) : participants.length > 0 ? (
                      <div className="space-y-1">
                        {participants.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-white rounded px-2 py-1.5">
                            <span className="text-sm">{p.user?.display_name ?? "Unbekannt"}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-4 ${
                                p.status === "going" ? "bg-green-50 text-green-700 border-green-200" :
                                p.status === "interested" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {p.status === "going" ? "Zusage" : p.status === "interested" ? "Interesse" : "Absage"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Keine Teilnehmer</p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
