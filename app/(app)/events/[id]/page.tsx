"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  User,
  Tag,
  UserPlus,
  UserMinus,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";
import { EVENT_CATEGORIES } from "@/lib/constants";
import type { Event, EventParticipant } from "@/lib/supabase/types";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<"going" | "interested" | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Aktuellen Benutzer laden
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Event laden
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*, user:users(display_name, avatar_url)")
        .eq("id", id)
        .single();

      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData as unknown as Event);

      // Teilnehmer laden
      const { data: participantData } = await supabase
        .from("event_participants")
        .select("*, user:users(display_name, avatar_url)")
        .eq("event_id", id as string)
        .in("status", ["going", "interested"])
        .order("created_at", { ascending: true });

      if (participantData) {
        setParticipants(participantData as unknown as EventParticipant[]);

        // Eigenen Status ermitteln
        if (user) {
          const myParticipation = (participantData as unknown as EventParticipant[]).find(
            (p) => p.user_id === user.id
          );
          if (myParticipation) {
            setMyStatus(myParticipation.status as "going" | "interested");
          }
        }
      }

      setLoading(false);
    }
    load();
  }, [id]);

  // Teilnahme-Status setzen
  async function handleParticipate(status: "going" | "interested") {
    if (!event || !currentUserId) return;
    setActionLoading(true);

    try {
      const supabase = createClient();

      // Pruefen ob bereits ein Eintrag existiert
      const { data: existing } = await supabase
        .from("event_participants")
        .select("id")
        .eq("event_id", event.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existing) {
        // Status aktualisieren
        const { error } = await supabase
          .from("event_participants")
          .update({ status })
          .eq("event_id", event.id)
          .eq("user_id", currentUserId);

        if (error) {
          toast.error("Status konnte nicht geaendert werden.");
          setActionLoading(false);
          return;
        }
      } else {
        // Maximale Teilnehmer pruefen
        if (
          status === "going" &&
          event.max_participants &&
          goingCount >= event.max_participants
        ) {
          toast.error("Die maximale Teilnehmeranzahl ist bereits erreicht.");
          setActionLoading(false);
          return;
        }

        // Neuen Eintrag erstellen
        const { error } = await supabase.from("event_participants").insert({
          event_id: event.id,
          user_id: currentUserId,
          status,
        });

        if (error) {
          toast.error("Teilnahme konnte nicht gespeichert werden.");
          setActionLoading(false);
          return;
        }
      }

      // Lokalen Status aktualisieren
      setMyStatus(status);
      toast.success(
        status === "going"
          ? "Sie nehmen jetzt teil!"
          : "Sie wurden als interessiert markiert."
      );

      // Organisator benachrichtigen
      if (event.user_id) {
        createNotification({
          userId: event.user_id,
          type: "event_participation",
          title: status === "going" ? "Neuer Teilnehmer" : "Jemand ist interessiert",
          body: `Ein Nachbar ${status === "going" ? "nimmt an" : "interessiert sich für"} „${event.title}".`,
          referenceId: event.id,
          referenceType: "event",
        });
      }

      // Teilnehmer-Liste neu laden
      const { data: refreshed } = await supabase
        .from("event_participants")
        .select("*, user:users(display_name, avatar_url)")
        .eq("event_id", event.id)
        .in("status", ["going", "interested"])
        .order("created_at", { ascending: true });

      if (refreshed) {
        setParticipants(refreshed as unknown as EventParticipant[]);
      }
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    }

    setActionLoading(false);
  }

  // Teilnahme zurueckziehen
  async function handleCancel() {
    if (!event || !currentUserId) return;
    setActionLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("event_participants")
        .update({ status: "cancelled" })
        .eq("event_id", event.id)
        .eq("user_id", currentUserId);

      if (error) {
        toast.error("Abmeldung fehlgeschlagen.");
        setActionLoading(false);
        return;
      }

      setMyStatus(null);
      toast.success("Sie haben sich erfolgreich abgemeldet.");

      // Teilnehmer-Liste aktualisieren (entfernt abgemeldete)
      setParticipants((prev) => prev.filter((p) => p.user_id !== currentUserId));
    } catch {
      toast.error("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    }

    setActionLoading(false);
  }

  // Abgeleitete Daten
  const cat = event ? EVENT_CATEGORIES.find((c) => c.id === event.category) : null;
  const goingParticipants = participants.filter((p) => p.status === "going");
  const interestedParticipants = participants.filter((p) => p.status === "interested");
  const goingCount = goingParticipants.length;
  const isOrganizer = currentUserId && event?.user_id === currentUserId;
  const isFull =
    event?.max_participants != null && goingCount >= event.max_participants;

  // Ladezustand
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  // Event nicht gefunden
  if (!event) {
    return (
      <div className="space-y-4">
        <Link
          href="/events"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Zurueck zu den Veranstaltungen
        </Link>
        <p className="text-center text-muted-foreground">
          Veranstaltung nicht gefunden.
        </p>
      </div>
    );
  }

  // Datum formatieren
  const eventDate = parseISO(event.event_date);
  let dateLabel: string;
  if (isToday(eventDate)) {
    dateLabel = "Heute";
  } else if (isTomorrow(eventDate)) {
    dateLabel = "Morgen";
  } else {
    dateLabel = format(eventDate, "EEEE, d. MMMM yyyy", { locale: de });
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/events" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Veranstaltung</h1>
      </div>

      {/* Hauptkarte */}
      <div className="rounded-xl border-2 border-border bg-white p-5">
        <div className="flex items-start gap-4">
          {/* Kategorie-Icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-quartier-green/10 text-3xl">
            {cat?.icon ?? "📅"}
          </div>

          <div className="flex-1 min-w-0">
            {/* Titel */}
            <h2 className="text-lg font-bold text-anthrazit">{event.title}</h2>

            {/* Kategorie-Badge */}
            <Badge variant="secondary" className="mt-1">
              <Tag className="mr-1 h-3 w-3" />
              {cat?.label ?? event.category}
            </Badge>

            {/* Beschreibung */}
            {event.description && (
              <p className="mt-3 text-muted-foreground">{event.description}</p>
            )}

            {/* Metadaten */}
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span className="font-medium text-anthrazit">{dateLabel}</span>
              </div>

              {event.event_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    {event.event_time.slice(0, 5)} Uhr
                    {event.end_time ? ` - ${event.end_time.slice(0, 5)} Uhr` : ""}
                  </span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  {goingCount} Teilnehmer
                  {event.max_participants
                    ? ` von max. ${event.max_participants}`
                    : ""}
                </span>
                {isFull && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Ausgebucht
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                <span>
                  Organisiert von{" "}
                  <span className="font-medium text-anthrazit">
                    {event.user?.display_name ?? "Nachbar"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teilnahme-Aktionen */}
      {currentUserId && !isOrganizer && (
        <div className="space-y-3">
          {myStatus ? (
            <>
              <div className="rounded-lg bg-quartier-green/10 p-3 text-center text-sm">
                {myStatus === "going" ? (
                  <span className="font-medium text-quartier-green">
                    Sie nehmen an dieser Veranstaltung teil.
                  </span>
                ) : (
                  <span className="font-medium text-muted-foreground">
                    Sie sind als interessiert markiert.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {myStatus === "interested" && !isFull && (
                  <Button
                    onClick={() => handleParticipate("going")}
                    disabled={actionLoading}
                    className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {actionLoading ? "Wird gespeichert..." : "Jetzt teilnehmen"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className={myStatus === "interested" && !isFull ? "" : "w-full"}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Abmelden
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => handleParticipate("going")}
                disabled={actionLoading || isFull}
                className="flex-1 bg-quartier-green hover:bg-quartier-green-dark"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {actionLoading
                  ? "Wird gespeichert..."
                  : isFull
                    ? "Ausgebucht"
                    : "Teilnehmen"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleParticipate("interested")}
                disabled={actionLoading}
                className="flex-1"
              >
                <Star className="mr-2 h-4 w-4" />
                Interessiert
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Organisator-Hinweis */}
      {isOrganizer && (
        <div className="rounded-lg bg-quartier-green/10 p-3 text-center text-sm">
          <span className="font-medium text-quartier-green">
            Sie organisieren diese Veranstaltung.
          </span>
        </div>
      )}

      {/* Teilnehmer-Liste */}
      <div className="space-y-3">
        <h3 className="font-semibold text-anthrazit">
          <Users className="mr-1 inline h-4 w-4" />
          Teilnehmer ({goingCount})
        </h3>

        {goingParticipants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Teilnehmer. Seien Sie der Erste!
          </p>
        ) : (
          <div className="space-y-2">
            {goingParticipants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-white p-3 border border-border"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-quartier-green/10 text-sm font-bold text-quartier-green">
                  {p.user?.avatar_url ? (
                    <img
                      src={p.user.avatar_url}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    (p.user?.display_name?.[0] ?? "N").toUpperCase()
                  )}
                </div>
                <span className="text-sm font-medium text-anthrazit">
                  {p.user?.display_name ?? "Nachbar"}
                </span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  Dabei
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Interessierte */}
        {interestedParticipants.length > 0 && (
          <>
            <h3 className="mt-4 font-semibold text-anthrazit">
              <Star className="mr-1 inline h-4 w-4" />
              Interessiert ({interestedParticipants.length})
            </h3>
            <div className="space-y-2">
              {interestedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg bg-white p-3 border border-border"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {p.user?.avatar_url ? (
                      <img
                        src={p.user.avatar_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      (p.user?.display_name?.[0] ?? "N").toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {p.user?.display_name ?? "Nachbar"}
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    Interessiert
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
