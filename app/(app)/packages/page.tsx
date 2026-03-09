"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Paketannahme } from "@/lib/supabase/types";

export default function PackagesPage() {
  const [available, setAvailable] = useState<Paketannahme[]>([]);
  const [myEntry, setMyEntry] = useState<Paketannahme | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Heutige Verfuegbarkeiten laden
      const { data } = await supabase
        .from("paketannahme")
        .select("*, user:users(display_name, avatar_url)")
        .eq("available_date", today)
        .order("created_at", { ascending: false });

      if (data) {
        const entries = data as unknown as Paketannahme[];
        setAvailable(entries);
        const mine = entries.find((e) => e.user_id === user.id);
        if (mine) setMyEntry(mine);
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

  const othersAvailable = available.filter((a) => a.user_id !== currentUserId);

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
              Aktivieren Sie die Paketannahme, wenn Sie heute zuhause sind. Ihr Haus wird orange auf der Quartierskarte markiert,
              damit Nachbarn wissen, dass Sie Pakete entgegennehmen können.
            </p>
          </div>
        </div>
      </div>

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
            <div className="mb-2 text-3xl">📦</div>
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
