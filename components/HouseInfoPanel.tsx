"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle, UserPlus, Check, X, Clock, Home, Users, Plane,
} from "lucide-react";
import { STREET_CODE_TO_NAME, type StreetCode } from "@/lib/map-houses";
import type { NeighborConnectionStatus } from "@/lib/supabase/types";
import { toast } from "sonner";

interface Resident {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  connectionStatus: NeighborConnectionStatus | "none" | "self";
  connectionId: string | null;
  isRequester: boolean;
  // Urlaub-Info
  vacationEndDate: string | null;
  vacationNote: string | null;
}

interface HouseInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streetCode: StreetCode;
  houseNumber: string;
}

export function HouseInfoPanel({
  open,
  onOpenChange,
  streetCode,
  houseNumber,
}: HouseInfoPanelProps) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Leaflet reicht den echten Strassennamen durch, SVG den Legacy-Street-Code.
  const streetName = STREET_CODE_TO_NAME[streetCode] ?? streetCode;

  const loadResidents = useCallback(async () => {
    if (!open) return;
    setLoading(true);

    const supabase = createClient();
    const { user } = await getCachedUser(supabase);
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    // Haushalt finden über Straßenname + Hausnummer
    const { data: household } = await supabase
      .from("households")
      .select("id")
      .eq("street_name", streetName)
      .eq("house_number", houseNumber)
      .maybeSingle();

    if (!household) {
      setResidents([]);
      setLoading(false);
      return;
    }

    // Bewohner laden
    const { data: members } = await supabase
      .from("household_members")
      .select("user_id, users(id, display_name, avatar_url)")
      .eq("household_id", household.id)
      .not("verified_at", "is", null);

    if (!members || members.length === 0) {
      setResidents([]);
      setLoading(false);
      return;
    }

    const memberUserIds = members.map((m: Record<string, unknown>) => {
      const u = m.users as { id: string; display_name: string; avatar_url: string | null } | null;
      return u?.id ?? "";
    }).filter(Boolean);

    // Verbindungen des aktuellen Nutzers mit diesen Bewohnern laden
    const { data: connections } = await supabase
      .from("neighbor_connections")
      .select("id, requester_id, target_id, status")
      .or(
        memberUserIds.map(uid =>
          `and(requester_id.eq.${user.id},target_id.eq.${uid}),and(requester_id.eq.${uid},target_id.eq.${user.id})`
        ).join(",")
      );

    // Verbindungs-Map aufbauen
    const connMap: Record<string, {
      status: NeighborConnectionStatus;
      id: string;
      isRequester: boolean;
    }> = {};
    if (connections) {
      for (const c of connections) {
        const otherUserId = c.requester_id === user.id ? c.target_id : c.requester_id;
        connMap[otherUserId] = {
          status: c.status as NeighborConnectionStatus,
          id: c.id,
          isRequester: c.requester_id === user.id,
        };
      }
    }

    // Aktive Urlaube laden
    const today = new Date().toISOString().split("T")[0];
    const { data: vacations } = await supabase
      .from("vacation_modes")
      .select("user_id, end_date, note")
      .in("user_id", memberUserIds)
      .lte("start_date", today)
      .gte("end_date", today);

    const vacMap: Record<string, { endDate: string; note: string | null }> = {};
    if (vacations) {
      for (const v of vacations) {
        vacMap[v.user_id] = { endDate: v.end_date, note: v.note };
      }
    }

    const result: Resident[] = members.map((m: Record<string, unknown>) => {
      const u = m.users as { id: string; display_name: string; avatar_url: string | null } | null;
      if (!u) return null;
      const conn = connMap[u.id];
      const vac = vacMap[u.id];
      return {
        userId: u.id,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        connectionStatus: u.id === user.id ? "self" : (conn?.status ?? "none"),
        connectionId: conn?.id ?? null,
        isRequester: conn?.isRequester ?? false,
        vacationEndDate: vac?.endDate ?? null,
        vacationNote: vac?.note ?? null,
      };
    }).filter(Boolean) as Resident[];

    setResidents(result);
    setLoading(false);
  }, [open, streetName, houseNumber]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten laden bei Mount/Abhängigkeitsänderung
    loadResidents();
  }, [loadResidents]);

  // Verbindungsanfrage senden
  async function sendConnectionRequest(targetUserId: string) {
    if (!currentUserId) return;
    setSending(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("neighbor_connections")
      .insert({
        requester_id: currentUserId,
        target_id: targetUserId,
        message: requestMessage.trim() || null,
      });

    if (error) {
      toast.error("Anfrage konnte nicht gesendet werden.");
    } else {
      toast.success("Verbindungsanfrage gesendet!");
      setShowRequestForm(null);
      setRequestMessage("");
      await loadResidents();
    }
    setSending(false);
  }

  // Nachricht senden (Konversation öffnen/erstellen)
  async function openConversation(otherUserId: string) {
    if (!currentUserId) return;

    const supabase = createClient();

    // Bestehende Konversation suchen
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`
      )
      .maybeSingle();

    if (existing) {
      onOpenChange(false);
      router.push(`/messages/${existing.id}`);
    } else {
      // Neue Konversation erstellen (participant_1 < participant_2 wegen CHECK)
      const p1 = currentUserId < otherUserId ? currentUserId : otherUserId;
      const p2 = currentUserId < otherUserId ? otherUserId : currentUserId;

      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ participant_1: p1, participant_2: p2 })
        .select("id")
        .single();

      if (newConv) {
        onOpenChange(false);
        router.push(`/messages/${newConv.id}`);
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-quartier-green/10">
              <Home className="h-4.5 w-4.5 text-quartier-green" />
            </div>
            <div>
              <SheetTitle>{streetName} {houseNumber}</SheetTitle>
              <SheetDescription>Bewohner dieses Haushalts</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-3" />

        {/* Inhalt */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : residents.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Noch keine Bewohner registriert
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {residents.map((r) => (
                <div key={r.userId}>
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-sm font-bold text-quartier-green">
                      {r.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={r.avatarUrl} alt={r.displayName} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        (r.displayName[0] ?? "N").toUpperCase()
                      )}
                    </div>

                    {/* Name + Status */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-anthrazit">
                        {r.displayName}
                      </p>
                      {r.connectionStatus === "self" && (
                        <Badge variant="secondary" className="mt-0.5 text-xs">
                          Mein Profil
                        </Badge>
                      )}
                      {r.vacationEndDate && (
                        <div className="mt-0.5 flex items-center gap-1">
                          <Badge className="gap-1 bg-blue-100 text-blue-700 text-xs">
                            <Plane className="h-2.5 w-2.5" />
                            Im Urlaub bis {new Date(r.vacationEndDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </Badge>
                          {r.vacationNote && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={r.vacationNote}>
                              {r.vacationNote}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Aktionen */}
                    <div className="shrink-0">
                      {r.connectionStatus === "self" ? null : r.connectionStatus === "accepted" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-quartier-green text-quartier-green hover:bg-quartier-green/10"
                          onClick={() => openConversation(r.userId)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Nachricht
                        </Button>
                      ) : r.connectionStatus === "pending" ? (
                        r.isRequester ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            Anfrage gesendet
                          </Badge>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-quartier-green text-quartier-green hover:bg-quartier-green/10"
                              onClick={async () => {
                                const supabase = createClient();
                                await supabase
                                  .from("neighbor_connections")
                                  .update({ status: "accepted", responded_at: new Date().toISOString() })
                                  .eq("id", r.connectionId!);
                                toast.success("Verbindung angenommen!");
                                await loadResidents();
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-muted-foreground hover:text-destructive"
                              onClick={async () => {
                                const supabase = createClient();
                                await supabase
                                  .from("neighbor_connections")
                                  .update({ status: "declined", responded_at: new Date().toISOString() })
                                  .eq("id", r.connectionId!);
                                toast("Anfrage abgelehnt");
                                await loadResidents();
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )
                      ) : r.connectionStatus === "declined" ? (
                        <Badge variant="secondary" className="text-xs text-muted-foreground">
                          Abgelehnt
                        </Badge>
                      ) : (
                        // none — Verbindung anfragen
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setShowRequestForm(
                            showRequestForm === r.userId ? null : r.userId
                          )}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Verbinden
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Anfrage-Formular (aufklappbar) */}
                  {showRequestForm === r.userId && (
                    <div className="ml-13 mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Optionale Nachricht an {r.displayName}:
                      </p>
                      <Textarea
                        placeholder="Hallo, ich bin Ihr Nachbar..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        className="min-h-[60px] text-sm"
                        maxLength={300}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowRequestForm(null);
                            setRequestMessage("");
                          }}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          size="sm"
                          disabled={sending}
                          onClick={() => sendConnectionRequest(r.userId)}
                          className="bg-quartier-green hover:bg-quartier-green/90"
                        >
                          {sending ? "Sende..." : "Anfrage senden"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
