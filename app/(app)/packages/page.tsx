"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, Send, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Paketannahme, HelpRequest } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function PackagesPage() {
  const [available, setAvailable] = useState<Paketannahme[]>([]);
  const [myEntry, setMyEntry] = useState<Paketannahme | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Paket-Anfragen
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [requestDescription, setRequestDescription] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Heutige Verfuegbarkeiten + Paket-Anfragen parallel laden
      const [availResult, requestResult] = await Promise.all([
        supabase
          .from("paketannahme")
          .select("*, user:users(display_name, avatar_url)")
          .eq("available_date", today)
          .order("created_at", { ascending: false }),
        supabase
          .from("help_requests")
          .select("*, user:users(display_name, avatar_url)")
          .eq("category", "package")
          .eq("type", "need")
          .in("status", ["active", "matched"])
          .gte("created_at", `${today}T00:00:00`)
          .order("created_at", { ascending: false }),
      ]);

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
  }, [today]);

  async function toggleAvailability() {
    if (!currentUserId) return;
    setSaving(true);

    const supabase = createClient();

    if (myEntry) {
      // Verfuegbarkeit entfernen
      await supabase.from("paketannahme").delete().eq("id", myEntry.id);
      setMyEntry(null);
      setAvailable(available.filter((a) => a.id !== myEntry.id));
      toast.success("Paketannahme deaktiviert.");
    } else {
      // Verfuegbarkeit eintragen
      const { data, error } = await supabase
        .from("paketannahme")
        .insert({
          user_id: currentUserId,
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
        type: "need",
        category: "package",
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
    toast.success("Anfrage gesendet! Ihre Nachbarn werden informiert.");
    setSendingRequest(false);
  }

  async function acceptRequest(requestId: string) {
    if (!currentUserId) return;
    setRespondingTo(requestId);

    const supabase = createClient();

    // Antwort erstellen + Status auf "matched" setzen
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

    // Lokal aktualisieren
    setRequests(requests.map((r) =>
      r.id === requestId ? { ...r, status: "matched" as const } : r
    ));
    toast.success("Vielen Dank! Der Nachbar wird benachrichtigt.");
    setRespondingTo(null);
  }

  const othersAvailable = available.filter((a) => a.user_id !== currentUserId);
  const myRequests = requests.filter((r) => r.user_id === currentUserId);
  const otherRequests = requests.filter((r) => r.user_id !== currentUserId && r.status === "active");

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
        <Button
          onClick={submitRequest}
          disabled={sendingRequest || !requestDescription.trim()}
          className="w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
        >
          <Send className="mr-2 h-4 w-4" />
          {sendingRequest ? "Wird gesendet..." : "Nachbarn fragen"}
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
                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: de })}
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

      {/* Offene Anfragen von Nachbarn */}
      {otherRequests.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">
            Nachbarn suchen Hilfe ({otherRequests.length})
          </h2>
          <div className="space-y-2">
            {otherRequests.map((req) => (
              <div key={req.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">
                    📬
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-anthrazit">{req.user?.display_name ?? "Nachbar"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{req.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: de })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => acceptRequest(req.id)}
                  disabled={respondingTo === req.id}
                  className="mt-3 w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {respondingTo === req.id ? "Wird gesendet..." : "Ich nehme es an"}
                </Button>
              </div>
            ))}
          </div>
        </div>
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

      {/* Wer ist heute verfuegbar? */}
      <div>
        <h2 className="mb-3 font-semibold text-anthrazit">
          Heute verfügbar ({othersAvailable.length})
        </h2>

        {othersAvailable.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-2 text-3xl" aria-hidden="true">📦</div>
            <p className="text-sm text-muted-foreground">
              Heute nimmt noch niemand Pakete an.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {othersAvailable.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg">
                  📦
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-anthrazit">{entry.user?.display_name}</p>
                  {entry.note && (
                    <p className="truncate text-sm text-muted-foreground">{entry.note}</p>
                  )}
                </div>
                <Badge className="bg-orange-100 text-orange-700">Verfügbar</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Karten-Hinweis */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>Verfügbare Nachbarn werden orange auf der <Link href="/map" className="text-quartier-green hover:underline">Quartierskarte</Link> markiert.</span>
      </div>
    </div>
  );
}
