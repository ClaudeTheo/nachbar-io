"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "@/components/ExternalLink";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  CalendarClock,
  Clock,
  Tag,
  User,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { TrustScoreBadge } from "@/components/craftsmen/TrustScoreBadge";
import { CraftsmanRecommendation } from "@/components/craftsmen/CraftsmanRecommendation";
import { loadCraftsmanDetail } from "@/lib/craftsmen/hooks";
import { calculateTrustScore } from "@/lib/craftsmen/trust-score";
import { CRAFTSMAN_SUBCATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import type {
  CommunityTip,
  CraftsmanRecommendation as CraftsmanRec,
  CraftsmanUsageEvent,
  CraftsmanTrustScore,
} from "@/lib/supabase/types";

export default function HandwerkerDetailPage() {
  const { id } = useParams();
  const [tip, setTip] = useState<CommunityTip | null>(null);
  const [recommendations, setRecommendations] = useState<CraftsmanRec[]>([]);
  const [usageEvents, setUsageEvents] = useState<CraftsmanUsageEvent[]>([]);
  const [trustScore, setTrustScore] = useState<CraftsmanTrustScore | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sameStreetCount, setSameStreetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Aktuellen Benutzer laden
      const { user } = await getCachedUser(supabase);
      if (user) setCurrentUserId(user.id);

      // Detail laden
      const detail = await loadCraftsmanDetail(id as string);
      setTip(detail.tip);
      setRecommendations(detail.recommendations);
      setUsageEvents(detail.usageEvents);

      // Trust-Score berechnen
      const score = calculateTrustScore({
        recommendations: detail.recommendations,
        usageEvents: detail.usageEvents,
      });
      setTrustScore(score);

      // Same-Street Badge: Empfehlungen aus gleicher Strasse zaehlen
      const sameStreet = detail.recommendations.filter(
        (r) => (r as CraftsmanRec & { same_street?: boolean }).same_street
      ).length;
      setSameStreetCount(sameStreet);
    } catch (err) {
      console.error("Handwerker-Detail laden fehlgeschlagen:", err);
      setError("Handwerker nicht gefunden.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Subcategory-Labels ermitteln
  const subcategoryLabels = (tip?.subcategories ?? [])
    .map((subId) => CRAFTSMAN_SUBCATEGORIES.find((s) => s.id === subId))
    .filter(Boolean);

  const isOwner = currentUserId !== null && tip?.user_id === currentUserId;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error && !tip) {
    return (
      <div className="space-y-4">
        <Link href="/handwerker" className="flex items-center gap-2 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Zurück zu Handwerker
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

  // Primaeres Subcategory-Icon
  const primarySub = CRAFTSMAN_SUBCATEGORIES.find((s) => s.id === tip.subcategories?.[0]);
  const icon = primarySub?.icon ?? "🔧";

  // Letzte 5 Usage-Events
  const recentUsage = usageEvents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/handwerker" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Handwerker-Details</h1>
      </div>

      {/* Profil-Karte */}
      <div className="rounded-xl border-2 border-border bg-white p-5">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{icon}</span>
          <div className="flex-1">
            {/* Name + Gewerke */}
            <h2 className="text-lg font-bold text-anthrazit">
              {tip.business_name || tip.title}
            </h2>
            {tip.business_name && tip.title !== tip.business_name && (
              <p className="text-sm text-muted-foreground">{tip.title}</p>
            )}

            {/* Subcategory-Badges */}
            {subcategoryLabels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subcategoryLabels.map((sub) => (
                  <Badge key={sub!.id} variant="secondary">
                    {sub!.icon} {sub!.label}
                  </Badge>
                ))}
              </div>
            )}

            {/* Beschreibung */}
            <p className="mt-3 text-muted-foreground whitespace-pre-line">{tip.description}</p>

            {/* Kontakt & Standort */}
            <div className="mt-4 space-y-2 rounded-lg bg-muted/50 p-3">
              {tip.phone && (
                <a
                  href={`tel:${tip.phone}`}
                  className="flex items-center gap-2 text-sm text-quartier-green hover:underline min-h-[44px]"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {tip.phone}
                </a>
              )}
              {tip.email && (
                <a
                  href={`mailto:${tip.email}`}
                  className="flex items-center gap-2 text-sm text-quartier-green hover:underline min-h-[44px]"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {tip.email}
                </a>
              )}
              {(tip as CommunityTip & { website_url?: string }).website_url && (
                <ExternalLink
                  href={(tip as CommunityTip & { website_url: string }).website_url}
                  title="Website"
                  className="flex items-center gap-2 text-sm text-quartier-green hover:underline min-h-[44px]"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  Website besuchen
                </ExternalLink>
              )}
              {tip.location_hint && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {tip.location_hint}
                </p>
              )}
              {(tip as CommunityTip & { opening_hours?: string }).opening_hours && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  {(tip as CommunityTip & { opening_hours: string }).opening_hours}
                </p>
              )}
              {tip.service_area && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  Einzugsgebiet: {tip.service_area}
                  {tip.service_radius_km && ` (${tip.service_radius_km} km)`}
                </p>
              )}
            </div>

            {/* Bilder */}
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
                Handwerker
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

      {/* Trust-Score Banner */}
      {trustScore && (
        <div className="rounded-xl border-2 border-border bg-white p-5 text-center">
          <h3 className="mb-3 text-base font-bold text-anthrazit">Vertrauens-Score</h3>
          <div className="flex justify-center">
            <TrustScoreBadge score={trustScore} size="md" showRecency showUsageCount />
          </div>
          {sameStreetCount > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              <MapPin className="inline h-3.5 w-3.5 mr-1" />
              {sameStreetCount} {sameStreetCount === 1 ? "Empfehlung" : "Empfehlungen"} aus Ihrer Straße
            </p>
          )}
        </div>
      )}

      {/* Letzte Nutzungen */}
      {recentUsage.length > 0 && (
        <div className="rounded-xl border-2 border-border bg-white p-5">
          <h3 className="mb-3 text-base font-bold text-anthrazit">Letzte Beauftragungen</h3>
          <div className="space-y-2">
            {recentUsage.map((event) => (
              <div key={event.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {formatDistanceToNow(new Date(event.used_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
                {event.note && (
                  <span className="text-xs">— {event.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empfehlungen */}
      {currentUserId && (
        <div className="rounded-xl border-2 border-border bg-white p-5">
          <h3 className="mb-4 text-base font-bold text-anthrazit">Empfehlungen</h3>
          <CraftsmanRecommendation
            tipId={tip.id}
            currentUserId={currentUserId}
            isOwner={isOwner}
            recommendations={recommendations}
            onUpdate={loadData}
          />
        </div>
      )}
    </div>
  );
}
