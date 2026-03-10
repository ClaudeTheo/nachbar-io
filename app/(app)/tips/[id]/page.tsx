"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, CheckCircle2, Clock, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";
import { TIP_CATEGORIES } from "@/lib/constants";
import type { CommunityTip } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function TipDetailPage() {
  const { id } = useParams();
  const [tip, setTip] = useState<CommunityTip | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTip = useCallback(async () => {
    const supabase = createClient();

    // Aktuellen Benutzer laden
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Tipp laden
    const { data, error: fetchError } = await supabase
      .from("community_tips")
      .select("*, user:users(display_name, avatar_url)")
      .eq("id", id)
      .single();

    if (fetchError || !data) {
      setError("Tipp nicht gefunden.");
      setLoading(false);
      return;
    }

    const tipData = data as unknown as CommunityTip;
    setTip(tipData);
    setConfirmCount(tipData.confirmation_count);

    // Prüfen ob aktueller Nutzer bereits bestätigt hat
    if (user) {
      const { data: confirmation } = await supabase
        .from("tip_confirmations")
        .select("id")
        .eq("tip_id", id as string)
        .eq("user_id", user.id)
        .maybeSingle();

      setHasConfirmed(!!confirmation);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadTip();
  }, [loadTip]);

  // Bestätigung toggle
  async function handleToggleConfirmation() {
    if (!currentUserId || !tip) return;
    setConfirming(true);

    try {
      const supabase = createClient();

      if (hasConfirmed) {
        // Bestätigung entfernen
        await supabase
          .from("tip_confirmations")
          .delete()
          .eq("tip_id", tip.id)
          .eq("user_id", currentUserId);

        setHasConfirmed(false);
        setConfirmCount((prev) => Math.max(0, prev - 1));
      } else {
        // Bestätigung hinzufügen
        const { error: insertError } = await supabase
          .from("tip_confirmations")
          .insert({
            tip_id: tip.id,
            user_id: currentUserId,
          });

        if (insertError) {
          console.error("Bestätigung Fehler:", insertError);
          setError("Bestätigung konnte nicht gespeichert werden.");
          setConfirming(false);
          return;
        }

        setHasConfirmed(true);
        setConfirmCount((prev) => prev + 1);

        // Tipp-Ersteller benachrichtigen
        if (tip.user_id) {
          createNotification({
            userId: tip.user_id,
            type: "tip_confirmation",
            title: "Tipp bestätigt",
            body: `Ein Nachbar hat Ihren Tipp „${tip.title}" bestätigt.`,
            referenceId: tip.id,
            referenceType: "tip",
          });
        }
      }
    } catch {
      setError("Netzwerkfehler bei der Bestätigung.");
    }
    setConfirming(false);
  }

  const cat = tip ? TIP_CATEGORIES.find((c) => c.id === tip.category) : null;
  const isOwner = currentUserId && tip?.user_id === currentUserId;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error && !tip) {
    return (
      <div className="space-y-4">
        <Link href="/tips" className="flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zurück zu Tipps
        </Link>
        <p className="text-center text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!tip) return null;

  const timeAgo = formatDistanceToNow(new Date(tip.created_at), {
    addSuffix: true,
    locale: de,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tips" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Tipp-Details</h1>
      </div>

      {/* Hauptkarte */}
      <div className="rounded-xl border-2 border-border bg-white p-5">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{cat?.icon ?? "💡"}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-anthrazit">{tip.title}</h2>
              <Badge variant="secondary">{cat?.label ?? tip.category}</Badge>
            </div>

            {tip.business_name && (
              <p className="mt-1 text-base font-semibold text-quartier-green">
                {tip.business_name}
              </p>
            )}

            <p className="mt-3 text-muted-foreground whitespace-pre-line">{tip.description}</p>

            {/* Ort & Kontakt */}
            {(tip.location_hint || tip.contact_hint) && (
              <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3">
                {tip.location_hint && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {tip.location_hint}
                  </p>
                )}
                {tip.contact_hint && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    {tip.contact_hint}
                  </p>
                )}
              </div>
            )}

            {/* Meta-Informationen */}
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {cat?.label ?? tip.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeAgo}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {tip.user?.display_name ?? "Nachbar"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bestätigungs-Bereich */}
      <div className="rounded-xl border-2 border-border bg-white p-5 text-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-lg font-bold text-anthrazit">
          <CheckCircle2 className={`h-6 w-6 ${confirmCount > 0 ? "text-quartier-green" : "text-muted-foreground"}`} />
          {confirmCount} {confirmCount === 1 ? "Bestätigung" : "Bestätigungen"}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {confirmCount === 0
            ? "Noch keine Bestätigungen. Kennen Sie diesen Tipp?"
            : `${confirmCount} ${confirmCount === 1 ? "Nachbar hat" : "Nachbarn haben"} diesen Tipp bestätigt.`}
        </p>

        {currentUserId && !isOwner && (
          <Button
            onClick={handleToggleConfirmation}
            disabled={confirming}
            variant={hasConfirmed ? "outline" : "default"}
            className={
              hasConfirmed
                ? "border-quartier-green text-quartier-green hover:bg-quartier-green/10"
                : "bg-quartier-green hover:bg-quartier-green-dark"
            }
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {confirming
              ? "Wird gespeichert..."
              : hasConfirmed
                ? "Bestätigung zurücknehmen"
                : "Kann ich bestätigen"}
          </Button>
        )}

        {isOwner && (
          <p className="text-xs text-muted-foreground">
            Sie können Ihren eigenen Tipp nicht bestätigen.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-emergency-red">{error}</p>}
    </div>
  );
}
