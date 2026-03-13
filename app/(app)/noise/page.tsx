"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQuarter } from "@/lib/quarters";
import { NOISE_CATEGORIES, NOISE_DURATIONS } from "@/lib/constants";
import { haversineDistance, RADIUS_DIRECT } from "@/lib/geo";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import type { HelpRequest } from "@/lib/supabase/types";

// Mapping: user_id → { lat, lng }
type UserPosMap = Map<string, { lat: number; lng: number }>;

export default function NoisePage() {
  const [warnings, setWarnings] = useState<HelpRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Formular
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("2");
  const [extraNote, setExtraNote] = useState("");

  // Distanz-Berechnung
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [userPositions, setUserPositions] = useState<UserPosMap>(new Map());

  const { currentQuarter } = useQuarter();

  const loadData = useCallback(async () => {
    if (!currentQuarter) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    try {
      const [warningsResult, householdsResult, membersResult] = await Promise.all([
        supabase
          .from("help_requests")
          .select("*, user:users(display_name, avatar_url)")
          .eq("quarter_id", currentQuarter.id)
          .eq("category", "noise")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase.from("households").select("id, lat, lng"),
        supabase.from("household_members").select("user_id, household_id").not("verified_at", "is", null),
      ]);

      // Position-Mapping aufbauen
      const households = (householdsResult.data ?? []) as { id: string; lat: number; lng: number }[];
      const members = (membersResult.data ?? []) as { user_id: string; household_id: string }[];
      const householdMap = new Map(households.map((h) => [h.id, { lat: h.lat, lng: h.lng }]));
      const posMap: UserPosMap = new Map();
      for (const m of members) {
        const pos = householdMap.get(m.household_id);
        if (pos) posMap.set(m.user_id, pos);
      }
      setUserPositions(posMap);
      const myPosition = posMap.get(user.id);
      if (myPosition) setMyPos(myPosition);

      // Abgelaufene Warnungen filtern (client-seitig)
      const now = new Date();
      const active = ((warningsResult.data ?? []) as unknown as HelpRequest[]).filter((w) => {
        if (!w.expires_at) return true;
        return new Date(w.expires_at) > now;
      });
      setWarnings(active);
    } catch {
      toast.error("Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [currentQuarter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Distanz berechnen
  function distanceTo(userId: string): number | null {
    if (!myPos) return null;
    const otherPos = userPositions.get(userId);
    if (!otherPos) return null;
    return haversineDistance(myPos.lat, myPos.lng, otherPos.lat, otherPos.lng);
  }

  function isDirect(userId: string): boolean {
    const dist = distanceTo(userId);
    if (dist === null) return true;
    return dist <= RADIUS_DIRECT;
  }

  async function submitWarning() {
    if (!currentUserId || !selectedCategory) return;
    setSending(true);

    const cat = NOISE_CATEGORIES.find((c) => c.id === selectedCategory);
    const dur = NOISE_DURATIONS.find((d) => d.id === selectedDuration);
    if (!cat || !dur) return;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + dur.hours);

    const title = `${cat.icon} ${cat.label}`;
    const description = extraNote.trim()
      ? `${dur.label} — ${extraNote.trim()}`
      : dur.label;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("help_requests")
      .insert({
        user_id: currentUserId,
        type: "offer",
        category: "noise",
        subcategory: selectedCategory,
        title,
        description,
        status: "active",
        expires_at: expiresAt.toISOString(),
      })
      .select("*, user:users(display_name, avatar_url)")
      .single();

    if (error) {
      toast.error("Warnung konnte nicht gesendet werden.");
      setSending(false);
      return;
    }

    setWarnings([data as unknown as HelpRequest, ...warnings]);
    setSelectedCategory("");
    setExtraNote("");
    toast.success("Ihre Nachbarn wurden informiert!");
    setSending(false);
  }

  async function cancelWarning(id: string) {
    const supabase = createClient();
    await supabase.from("help_requests").update({ status: "closed" }).eq("id", id);
    setWarnings(warnings.filter((w) => w.id !== id));
    toast.success("Lärm-Warnung aufgehoben.");
  }

  // Aufteilen: meine Warnungen vs. andere
  const myWarnings = warnings.filter((w) => w.user_id === currentUserId);
  const otherWarnings = warnings.filter((w) => w.user_id !== currentUserId);
  const directWarnings = otherWarnings.filter((w) => isDirect(w.user_id));
  const widerWarnings = otherWarnings.filter((w) => !isDirect(w.user_id));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Lärm-Warnung</h1>
      </div>

      {/* Info */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Volume2 className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Höflich vorwarnen</p>
            <p className="mt-1 text-sm text-blue-700">
              Informieren Sie Ihre Nachbarn vorab über Lärm. So vermeiden Sie Konflikte
              und zeigen Rücksicht.
            </p>
          </div>
        </div>
      </div>

      {/* Warnung erstellen */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-anthrazit">Was wird laut?</h2>

        {/* Kategorie-Auswahl */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          {NOISE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 rounded-lg border-2 p-3 text-left text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "border-quartier-green bg-quartier-green/5 text-anthrazit"
                  : "border-border text-muted-foreground hover:border-quartier-green/50"
              }`}
            >
              <span className="text-lg" aria-hidden="true">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dauer */}
        {selectedCategory && (
          <>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-anthrazit">
              <Clock className="h-4 w-4" /> Wie lange?
            </h3>
            <div className="mb-4 flex flex-wrap gap-2">
              {NOISE_DURATIONS.map((dur) => (
                <button
                  key={dur.id}
                  onClick={() => setSelectedDuration(dur.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selectedDuration === dur.id
                      ? "border-quartier-green bg-quartier-green text-white"
                      : "border-border text-muted-foreground hover:border-quartier-green/50"
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>

            {/* Zusätzlicher Hinweis */}
            <Input
              placeholder="Zusätzlicher Hinweis (optional)"
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              maxLength={100}
              className="mb-4"
            />

            <Button
              onClick={submitWarning}
              disabled={sending}
              className="w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Wird gesendet..." : "Nachbarn informieren"}
            </Button>
          </>
        )}
      </div>

      {/* Meine aktiven Warnungen */}
      {myWarnings.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">Ihre aktiven Warnungen</h2>
          <div className="space-y-2">
            {myWarnings.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-lg border border-quartier-green/30 bg-quartier-green/5 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-lg">
                  {NOISE_CATEGORIES.find((c) => c.id === w.subcategory)?.icon ?? "🔊"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-anthrazit">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.description} · Läuft ab {w.expires_at ? formatDistanceToNow(new Date(w.expires_at), { addSuffix: true, locale: de }) : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelWarning(w.id)}
                  className="shrink-0"
                >
                  Aufheben
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnungen von direkten Nachbarn */}
      {directWarnings.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">
            Direkte Nachbarn ({directWarnings.length})
          </h2>
          <WarningList warnings={directWarnings} distanceFn={distanceTo} />
        </div>
      )}

      {/* Warnungen von weiteren Nachbarn */}
      {widerWarnings.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-anthrazit">
            Weitere Nachbarn ({widerWarnings.length})
          </h2>
          <WarningList warnings={widerWarnings} distanceFn={distanceTo} />
        </div>
      )}

      {/* Keine Warnungen */}
      {otherWarnings.length === 0 && myWarnings.length === 0 && (
        <div className="py-8 text-center">
          <div className="mb-3 text-5xl" aria-hidden="true">🤫</div>
          <p className="text-muted-foreground">Alles ruhig im Quartier</p>
        </div>
      )}
    </div>
  );
}

// Wiederverwendbare Warn-Liste
function WarningList({
  warnings,
  distanceFn,
}: {
  warnings: HelpRequest[];
  distanceFn: (userId: string) => number | null;
}) {
  return (
    <div className="space-y-2">
      {warnings.map((w) => {
        const dist = distanceFn(w.user_id);
        const cat = NOISE_CATEGORIES.find((c) => c.id === w.subcategory);
        const isExpiringSoon = w.expires_at && (new Date(w.expires_at).getTime() - Date.now()) < 3600000;

        return (
          <div key={w.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg">
                {cat?.icon ?? "🔊"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-anthrazit">{w.user?.display_name ?? "Nachbar"}</p>
                  {isExpiringSoon && (
                    <Badge className="bg-green-100 text-green-700 text-xs">Bald vorbei</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-anthrazit">{w.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {w.description}
                  {dist !== null ? ` · ~${Math.round(dist)}m entfernt` : ""}
                  {" · "}
                  {formatDistanceToNow(new Date(w.created_at), { addSuffix: true, locale: de })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
