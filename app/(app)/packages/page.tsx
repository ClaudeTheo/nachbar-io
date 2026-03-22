"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, Send, CircleCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { useQuarter } from "@/lib/quarters";
import { haversineDistance, RADIUS_DIRECT } from "@/lib/geo";
import type { Paketannahme, HelpRequest } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

// Typ fuer Household-Position
interface HouseholdPos {
  id: string;
  lat: number;
  lng: number;
}

// Mapping: user_id → { lat, lng }
type UserPosMap = Map<string, { lat: number; lng: number }>;

export default function PackagesPage() {
  const [available, setAvailable] = useState<Paketannahme[]>([]);
  const [myEntry, setMyEntry] = useState<Paketannahme | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Eigene Position
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);

  // User → Position Mapping
  const [userPositions, setUserPositions] = useState<UserPosMap>(new Map());

  // Paket-Anfragen
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [requestDescription, setRequestDescription] = useState("");
  const [askAll, setAskAll] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const { currentQuarter } = useQuarter();

  useEffect(() => {
    if (!currentQuarter) return;
    async function load() {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
      if (!user) return;
      setCurrentUserId(user.id);

      // Alles parallel laden
      const [availResult, requestResult, householdsResult, membersResult] = await Promise.all([
        supabase
          .from("paketannahme")
          .select("*, user:users(display_name, avatar_url)")
          .eq("quarter_id", currentQuarter!.id)
          .eq("available_date", today)
          .order("created_at", { ascending: false }),
        supabase
          .from("help_requests")
          .select("*, user:users(display_name, avatar_url)")
          .eq("quarter_id", currentQuarter!.id)
          .eq("category", "package")
          .eq("type", "need")
          .in("status", ["active", "matched"])
          .gte("created_at", `${today}T00:00:00`)
          .order("created_at", { ascending: false }),
        supabase
          .from("households")
          .select("id, lat, lng"),
        supabase
          .from("household_members")
          .select("user_id, household_id")
          .not("verified_at", "is", null),
      ]);

      // User → Position Mapping aufbauen
      const households = (householdsResult.data ?? []) as HouseholdPos[];
      const members = (membersResult.data ?? []) as { user_id: string; household_id: string }[];
      const householdMap = new Map(households.map((h) => [h.id, { lat: h.lat, lng: h.lng }]));
      const posMap: UserPosMap = new Map();

      for (const m of members) {
        const pos = householdMap.get(m.household_id);
        if (pos) posMap.set(m.user_id, pos);
      }
      setUserPositions(posMap);

      // Eigene Position setzen
      const myPosition = posMap.get(user.id);
      if (myPosition) setMyPos(myPosition);

      if (availResult.data) {
        const entries = availResult.data as unknown as Paketannahme[];
        setAvailable(entries);
        const mine = entries.find((e) => e.user_id === user.id);
        if (mine) setMyEntry(mine);
      }

      if (requestResult.data) {
        setRequests(requestResult.data as unknown as HelpRequest[]);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, currentQuarter?.id]);

  // Distanz eines Users zu mir berechnen
  function distanceTo(userId: string): number | null {
    if (!myPos) return null;
    const otherPos = userPositions.get(userId);
    if (!otherPos) return null;
    return haversineDistance(myPos.lat, myPos.lng, otherPos.lat, otherPos.lng);
  }

  // Prüfen ob User ein direkter Nachbar ist
  function isDirect(userId: string): boolean {
    const dist = distanceTo(userId);
    if (dist === null) return true; // Im Zweifel anzeigen
    return dist <= RADIUS_DIRECT;
  }

  async function toggleAvailability() {
    if (!currentUserId) return;
    setSaving(true);

    const supabase = createClient();

    if (myEntry) {
      await supabase.from("paketannahme").delete().eq("id", myEntry.id);
      setMyEntry(null);
      setAvailable(available.filter((a) => a.id !== myEntry.id));
      toast.success("Paketannahme deaktiviert.");
    } else {
      const { data, error } = await supabase
        .from("paketannahme")
        .insert({
          user_id: currentUserId,
          quarter_id: currentQuarter?.id,
          available_date: today,
          note: note.trim() || null,
        })
        .select("*, user:users(display_name, avatar_url)")
        .single();

      if (error) {
        toast.error("Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      const entry = data as unknown as Paketannahme;
      setMyEntry(entry);
      setAvailable([entry, ...available]);
      toast.success("Sie nehmen heute Pakete an!");
    }

    setSaving(false);
  }

  async function submitRequest() {
    if (!currentUserId || !requestDescription.trim()) return;
    setSendingRequest(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("help_requests")
      .insert({
        user_id: currentUserId,
        quarter_id: currentQuarter?.id,
        type: "need",
        category: "package",
        subcategory: askAll ? "all" : null,
        title: "Paketannahme gesucht",
        description: requestDescription.trim(),
        status: "active",
      })
      .select("*, user:users(display_name, avatar_url)")
      .single();

    if (error) {
      toast.error("Anfrage konnte nicht gesendet werden.");
      setSendingRequest(false);
      return;
    }

    const newRequest = data as unknown as HelpRequest;
    setRequests([newRequest, ...requests]);
    setRequestDescription("");
    setAskAll(false);
    toast.success(askAll
      ? "Anfrage an alle Nachbarn gesendet!"
      : "Anfrage an direkte Nachbarn gesendet!"
    );
    setSendingRequest(false);
  }

  async function acceptRequest(requestId: string) {
    if (!currentUserId) return;
    setRespondingTo(requestId);

    const supabase = createClient();

    const [responseResult, statusResult] = await Promise.all([
      supabase.from("help_responses").insert({
        help_request_id: requestId,
        responder_user_id: currentUserId,
        message: "Ich nehme Ihr Paket an!",
      }),
      supabase
        .from("help_requests")
        .update({ status: "matched" })
        .eq("id", requestId),
    ]);

    if (responseResult.error || statusResult.error) {
      toast.error("Antwort konnte nicht gesendet werden.");
      setRespondingTo(null);
      return;
    }

    setRequests(requests.map((r) =>
      r.id === requestId ? { ...r, status: "matched" as const } : r
    ));
    toast.success("Vielen Dank! Der Nachbar wird benachrichtigt.");
    setRespondingTo(null);
  }

  // Aufteilen nach Distanz
  const othersAvailable = available.filter((a) => a.user_id !== currentUserId);
  const directAvailable = othersAvailable.filter((a) => isDirect(a.user_id));
  const widerAvailable = othersAvailable.filter((a) => !isDirect(a.user_id));

  const myRequests = requests.filter((r) => r.user_id === currentUserId);
  const otherActiveRequests = requests.filter((r) => r.user_id !== currentUserId && r.status === "active");

  // Anfragen anderer: direkte Nachbarn sehen alles, weitere nur wenn subcategory === "all"
  const directRequests = otherActiveRequests.filter((r) => isDirect(r.user_id));
  const widerRequests = otherActiveRequests.filter((r) => !isDirect(r.user_id) && r.subcategory === "all");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Paketannahme</h1>
      </div>

      {/* Info-Box */}
      <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 text-orange-600" />
          <div>
            <p className="font-medium text-orange-900">Wie funktioniert es?</p>
            <p className="mt-1 text-sm text-orange-700">
              Aktivieren Sie die Paketannahme, wenn Sie heute zuhause sind. Oder stellen Sie eine Anfrage,
              wenn Sie ein Paket erwarten und nicht zuhause sind.
            </p>
          </div>
        </div>
      </div>

      {/* Paket-Anfrage stellen */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-anthrazit">
          <span aria-hidden="true">📬</span> Paket erwartet?
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Fragen Sie Ihre Nachbarn, ob jemand ein Paket für Sie annehmen kann.
        </p>
        <Input
          placeholder="z.B. Amazon-Paket, kommt nachmittags"
          value={requestDescription}
          onChange={(e) => setRequestDescription(e.target.value)}
          maxLength={200}
          className="mb-3"
        />

        {/* Radius-Toggle */}
        <label className="mb-3 flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50">
          <input
            type="checkbox"
            checked={askAll}
            onChange={(e) => setAskAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-quartier-green"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-anthrazit">Auch weitere Nachbarn fragen</span>
            <p className="text-xs text-muted-foreground">
              Standard: nur direkte Nachbarn (≤50m)
            </p>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </label>

        <Button
          onClick={submitRequest}
          disabled={sendingRequest || !requestDescription.trim()}
          className="w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
        >
          <Send className="mr-2 h-4 w-4" />
          {sendingRequest ? "Wird gesendet..." : askAll ? "Alle Nachbarn fragen" : "Direkte Nachbarn fragen"}
        </Button>
      </div>

      {/* Meine Anfragen */}
      {myRequests.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">Meine Anfragen</h2>
          <div className="space-y-2">
            {myRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-lg">
                  📬
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-anthrazit">{req.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.subcategory === "all" ? "Alle Nachbarn" : "Direkte Nachbarn"} · {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: de })}
                  </p>
                </div>
                <Badge className={req.status === "matched"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
                }>
                  {req.status === "matched" ? "Angenommen" : "Offen"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anfragen von direkten Nachbarn */}
      {directRequests.length > 0 && (
        <RequestList
          title="Direkte Nachbarn suchen Hilfe"
          requests={directRequests}
          respondingTo={respondingTo}
          onAccept={acceptRequest}
          distanceFn={distanceTo}
        />
      )}

      {/* Anfragen von weiteren Nachbarn */}
      {widerRequests.length > 0 && (
        <RequestList
          title="Weitere Nachbarn suchen Hilfe"
          requests={widerRequests}
          respondingTo={respondingTo}
          onAccept={acceptRequest}
          distanceFn={distanceTo}
        />
      )}

      {/* Toggle: Bin ich heute verfuegbar? */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-anthrazit">
          {myEntry ? "Sie nehmen heute Pakete an" : "Heute verfügbar?"}
        </h2>

        {!myEntry && (
          <Input
            placeholder="Hinweis (optional, z.B. 'Klingeln bei Müller, 2. OG')"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            className="mb-3"
          />
        )}

        {myEntry && myEntry.note && (
          <p className="mb-3 text-sm text-muted-foreground">Hinweis: {myEntry.note}</p>
        )}

        <Button
          onClick={toggleAvailability}
          disabled={saving}
          className={`w-full ${
            myEntry
              ? "bg-muted text-anthrazit hover:bg-muted/80"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          <Package className="mr-2 h-4 w-4" />
          {myEntry ? "Paketannahme deaktivieren" : "Ja, ich nehme heute Pakete an"}
        </Button>
      </div>

      {/* Direkte Nachbarn verfuegbar */}
      <div>
        <h2 className="mb-3 font-semibold text-anthrazit">
          Direkte Nachbarn verfügbar ({directAvailable.length})
        </h2>
        {directAvailable.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Kein direkter Nachbar nimmt heute Pakete an.
            </p>
          </div>
        ) : (
          <AvailableList entries={directAvailable} distanceFn={distanceTo} />
        )}
      </div>

      {/* Weitere Nachbarn verfuegbar */}
      {widerAvailable.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">
            Weitere Nachbarn verfügbar ({widerAvailable.length})
          </h2>
          <AvailableList entries={widerAvailable} distanceFn={distanceTo} />
        </div>
      )}

      {/* Karten-Hinweis */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>Verfügbare Nachbarn werden orange auf der <Link href="/map" className="text-quartier-green hover:underline">Quartierskarte</Link> markiert.</span>
      </div>
    </div>
  );
}

// Wiederverwendbare Komponente: Liste von Paket-Anfragen
function RequestList({
  title,
  requests,
  respondingTo,
  onAccept,
  distanceFn,
}: {
  title: string;
  requests: HelpRequest[];
  respondingTo: string | null;
  onAccept: (id: string) => void;
  distanceFn: (userId: string) => number | null;
}) {
  return (
    <div>
      <h2 className="mb-3 font-semibold text-anthrazit">{title} ({requests.length})</h2>
      <div className="space-y-2">
        {requests.map((req) => {
          const dist = distanceFn(req.user_id);
          return (
            <div key={req.id} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">
                  📬
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-anthrazit">{req.user?.display_name ?? "Nachbar"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{req.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dist !== null ? `~${Math.round(dist)}m entfernt · ` : ""}
                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: de })}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onAccept(req.id)}
                disabled={respondingTo === req.id}
                className="mt-3 w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
                size="sm"
              >
                <CircleCheck className="mr-2 h-4 w-4" />
                {respondingTo === req.id ? "Wird gesendet..." : "Ich nehme es an"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Wiederverwendbare Komponente: Liste verfuegbarer Nachbarn
function AvailableList({
  entries,
  distanceFn,
}: {
  entries: Paketannahme[];
  distanceFn: (userId: string) => number | null;
}) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const dist = distanceFn(entry.user_id);
        return (
          <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">
              📦
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-anthrazit">{entry.user?.display_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {entry.note && <span className="truncate">{entry.note}</span>}
                {dist !== null && <span className="shrink-0">~{Math.round(dist)}m</span>}
              </div>
            </div>
            <Badge className="bg-orange-100 text-orange-700">Verfügbar</Badge>
          </div>
        );
      })}
    </div>
  );
}
