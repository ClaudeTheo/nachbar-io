"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import { ArrowLeft, MapPin, Phone, CircleCheckBig, Clock, Tag, User, Globe, CalendarClock, Crown } from "lucide-react";
import { BusinessReview } from "@/components/BusinessReview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createNotification } from "@/lib/notifications";
import { TIP_CATEGORIES } from "@/lib/constants";
import type { CommunityTip } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export default function TipDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tip, setTip] = useState<CommunityTip | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTip = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

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
  }, [id, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTip();
  }, [loadTip]);

  // Bestätigung toggle
  async function handleToggleConfirmation() {
    if (!user?.id || !tip) return;
    setConfirming(true);

    try {
      const supabase = createClient();

      if (hasConfirmed) {
        // Bestätigung entfernen
        await supabase
          .from("tip_confirmations")
          .delete()
          .eq("tip_id", tip.id)
          .eq("user_id", user?.id);

        setHasConfirmed(false);
        setConfirmCount((prev) => Math.max(0, prev - 1));
      } else {
        // Bestätigung hinzufügen
        const { error: insertError } = await supabase
          .from("tip_confirmations")
          .insert({
            tip_id: tip.id,
            user_id: user?.id,
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
  const isOwner = user?.id && tip?.user_id === user?.id;

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

            {/* Premium-Badge */}
            {(tip as CommunityTip & { is_premium?: boolean }).is_premium && (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                <Crown className="h-3 w-3" />
                Premium-Eintrag
              </div>
            )}

            {/* Premium-Felder: Website, Oeffnungszeiten, Bilder */}
            {(tip as CommunityTip & { website_url?: string }).website_url && (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <ExternalLink
                  href={(tip as CommunityTip & { website_url: string }).website_url}
                  title="Website"
                  className="text-quartier-green hover:underline"
                >
                  Website besuchen
                </ExternalLink>
              </p>
            )}

            {(tip as CommunityTip & { opening_hours?: string }).opening_hours && (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4 shrink-0" />
                {(tip as CommunityTip & { opening_hours: string }).opening_hours}
              </p>
            )}

            {((tip as CommunityTip & { images?: string[] }).images?.length ?? 0) > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {(tip as CommunityTip & { images: string[] }).images.map((url: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Bild ${i + 1}`}
                    className="h-32 w-32 rounded-lg object-cover flex-shrink-0"
                  />
                ))}
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
          <CircleCheckBig className={`h-6 w-6 ${confirmCount > 0 ? "text-quartier-green" : "text-muted-foreground"}`} />
          {confirmCount} {confirmCount === 1 ? "Bestätigung" : "Bestätigungen"}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {confirmCount === 0
            ? "Noch keine Bestätigungen. Kennen Sie diesen Tipp?"
            : `${confirmCount} ${confirmCount === 1 ? "Nachbar hat" : "Nachbarn haben"} diesen Tipp bestätigt.`}
        </p>

        {user?.id && !isOwner && (
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
            <CircleCheckBig className="mr-2 h-4 w-4" />
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

      {/* Bewertungen */}
      <BusinessReview tipId={tip.id} currentUserId={user?.id ?? null} />

      {error && <p className="text-sm text-emergency-red">{error}</p>}
    </div>
  );
}
