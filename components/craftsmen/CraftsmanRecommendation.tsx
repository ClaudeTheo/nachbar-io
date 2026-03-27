"use client";

import { useState, useCallback } from "react";
import { ThumbsUp, ThumbsDown, CircleCheck, Star, RefreshCw, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { submitRecommendation, logUsageEvent } from "@/lib/craftsmen/hooks";
import { CRAFTSMAN_ASPECTS } from "@/lib/constants";
import type { CraftsmanRecommendation as CraftsmanRec, CraftsmanAspects } from "@/lib/supabase/types";

interface CraftsmanRecommendationProps {
  tipId: string;
  currentUserId: string;
  isOwner: boolean;
  recommendations: CraftsmanRec[];
  onUpdate: () => void;
}

// Sterne-Bewertung (1-5)
function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`${star} Stern${star > 1 ? "e" : ""}`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function CraftsmanRecommendation({
  tipId,
  currentUserId,
  isOwner,
  recommendations,
  onUpdate,
}: CraftsmanRecommendationProps) {
  // Bestehende Empfehlung des aktuellen Nutzers
  const myRecommendation = recommendations.find((r) => r.user_id === currentUserId);
  const otherRecommendations = recommendations.filter((r) => r.user_id !== currentUserId);

  // Formular-State
  const [recommends, setRecommends] = useState<boolean | null>(null);
  const [confirmedUsage, setConfirmedUsage] = useState(false);
  const [comment, setComment] = useState("");
  const [aspects, setAspects] = useState<CraftsmanAspects>({});
  const [submitting, setSubmitting] = useState(false);
  const [loggingUsage, setLoggingUsage] = useState(false);

  // Aspekt-Rating ändern
  const setAspectRating = useCallback((key: keyof CraftsmanAspects, value: number) => {
    setAspects((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Empfehlung absenden
  const handleSubmit = useCallback(async () => {
    if (recommends === null) return;
    setSubmitting(true);

    const aspectsToSubmit = Object.keys(aspects).length > 0 ? aspects : null;
    const { error } = await submitRecommendation({
      tipId,
      recommends,
      confirmedUsage,
      comment: comment || null,
      aspects: aspectsToSubmit,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(recommends ? "Empfehlung abgegeben!" : "Bewertung gespeichert.");
      onUpdate();
    }
  }, [tipId, recommends, confirmedUsage, comment, aspects, onUpdate]);

  // Erneut beauftragt
  const handleLogUsage = useCallback(async () => {
    setLoggingUsage(true);
    const { error } = await logUsageEvent({ tipId });
    setLoggingUsage(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Nutzung protokolliert!");
      onUpdate();
    }
  }, [tipId, onUpdate]);

  // Eigentuemer kann eigenen Eintrag nicht empfehlen
  if (isOwner) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground italic">
          Sie können Ihren eigenen Eintrag nicht empfehlen.
        </p>
        <RecommendationList recommendations={otherRecommendations} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status: Bereits empfohlen */}
      {myRecommendation && (
        <div className="rounded-lg border border-quartier-green/20 bg-quartier-green/5 p-4">
          <div className="flex items-center gap-2 text-quartier-green font-medium">
            <CircleCheck className="h-5 w-5" />
            <span>Sie empfehlen diesen Handwerker</span>
          </div>
          {myRecommendation.comment && (
            <p className="mt-2 text-sm text-muted-foreground">
              &ldquo;{myRecommendation.comment}&rdquo;
            </p>
          )}

          {/* Erneut beauftragt */}
          <button
            onClick={handleLogUsage}
            disabled={loggingUsage}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors min-h-[80px]"
          >
            <RefreshCw className={`h-4 w-4 ${loggingUsage ? "animate-spin" : ""}`} />
            Erneut beauftragt
          </button>
        </div>
      )}

      {/* Formular: Neue Empfehlung (nur wenn noch keine vorhanden) */}
      {!myRecommendation && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Würden Sie diesen Handwerker empfehlen?</h3>

          {/* Ja / Nein Auswahl (Senior-freundlich, 80px Targets) */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRecommends(true)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 p-4 min-h-[80px] text-base font-medium transition-colors ${
                recommends === true
                  ? "border-quartier-green bg-quartier-green/10 text-quartier-green"
                  : "border-gray-200 hover:border-quartier-green/40"
              }`}
            >
              <ThumbsUp className="h-6 w-6" />
              Ja, empfehle ich
            </button>
            <button
              type="button"
              onClick={() => setRecommends(false)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 p-4 min-h-[80px] text-base font-medium transition-colors ${
                recommends === false
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-gray-200 hover:border-red-200"
              }`}
            >
              <ThumbsDown className="h-6 w-6" />
              Nein
            </button>
          </div>

          {/* Checkbox: Beauftragt */}
          <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={confirmedUsage}
              onChange={(e) => setConfirmedUsage(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300"
            />
            <span className="text-sm">Ich habe diesen Handwerker beauftragt</span>
          </label>

          {/* Aspekt-Bewertungen (optional) */}
          {recommends !== null && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Optionale Detailbewertung
              </h4>
              {CRAFTSMAN_ASPECTS.map((aspect) => (
                <div key={aspect.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    {aspect.icon} {aspect.label}
                  </span>
                  <StarRating
                    value={aspects[aspect.id as keyof CraftsmanAspects] ?? 0}
                    onChange={(v) => setAspectRating(aspect.id as keyof CraftsmanAspects, v)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Kommentar */}
          <div>
            <label htmlFor="rec-comment" className="block text-sm font-medium mb-1">
              Kommentar (optional)
            </label>
            <textarea
              id="rec-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Was war besonders gut oder schlecht?"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-quartier-green/40"
            />
            <span className="text-xs text-muted-foreground">{comment.length}/500</span>
          </div>

          {/* Absenden */}
          <button
            onClick={handleSubmit}
            disabled={recommends === null || submitting}
            className="w-full rounded-xl bg-quartier-green text-white py-3 font-medium min-h-[80px] text-base disabled:opacity-50 transition-colors hover:bg-quartier-green/90"
          >
            {submitting ? "Wird gespeichert…" : "Bewertung abgeben"}
          </button>
        </div>
      )}

      {/* Bestehende Empfehlungen anderer Nutzer */}
      <RecommendationList recommendations={otherRecommendations} />
    </div>
  );
}

// Liste bestehender Empfehlungen
function RecommendationList({ recommendations }: { recommendations: CraftsmanRec[] }) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        Empfehlungen ({recommendations.length})
      </h3>
      {recommendations.map((rec) => (
        <div key={rec.id} className="rounded-lg border p-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {rec.user?.display_name ?? "Nachbar"}
              </span>
              {rec.same_street && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 border border-blue-200">
                  <MapPin className="h-3 w-3" />
                  Aus Ihrer Straße
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true, locale: de })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {rec.recommends ? (
              <ThumbsUp className="h-4 w-4 text-quartier-green" />
            ) : (
              <ThumbsDown className="h-4 w-4 text-red-400" />
            )}
            <span>{rec.recommends ? "Empfohlen" : "Nicht empfohlen"}</span>
            {rec.confirmed_usage && (
              <span className="ml-2 text-xs text-muted-foreground">(beauftragt)</span>
            )}
          </div>
          {rec.comment && (
            <p className="text-sm text-muted-foreground">&ldquo;{rec.comment}&rdquo;</p>
          )}
        </div>
      ))}
    </div>
  );
}
