"use client";

// BusinessReview — Sternebewertung für Dienstleister/Tipps
// 1-5 Sterne + Text (max 500 Zeichen), nur für Nutzer registriert > 7 Tage

import { useState, useEffect } from "react";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  text: string | null;
  created_at: string;
  user?: { display_name: string };
}

interface BusinessReviewProps {
  tipId: string;
  currentUserId: string | null;
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          disabled={readonly}
          className={readonly ? "cursor-default" : "cursor-pointer"}
          aria-label={`${star} Stern${star !== 1 ? "e" : ""}`}
        >
          <Star
            className={`${sizeClass} ${
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function BusinessReview({ tipId, currentUserId }: BusinessReviewProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadReviews() {
    const supabase = createClient();
    const { data } = await supabase
      .from("tip_reviews")
      .select("id, user_id, rating, text, created_at, user:users(display_name)")
      .eq("tip_id", tipId)
      .order("created_at", { ascending: false });

    const reviewList = (data ?? []) as unknown as Review[];
    setReviews(reviewList);

    if (reviewList.length > 0) {
      const avg =
        reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length;
      setAvgRating(Math.round(avg * 10) / 10);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipId]);

  const hasOwnReview = reviews.some((r) => r.user_id === currentUserId);

  async function submitReview() {
    if (!currentUserId || newRating === 0) {
      toast.error("Bitte geben Sie eine Bewertung ab.");
      return;
    }
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("tip_reviews").insert({
      tip_id: tipId,
      user_id: currentUserId,
      rating: newRating,
      text: newText.trim() || null,
    });

    if (error) {
      if (error.message?.includes("7 days")) {
        toast.error(
          "Bewertungen sind erst 7 Tage nach der Registrierung möglich.",
        );
      } else {
        toast.error(`Fehler: ${error.message}`);
      }
      setSaving(false);
      return;
    }

    toast.success("Bewertung gespeichert!");
    setShowForm(false);
    setNewRating(0);
    setNewText("");
    loadReviews();
    setSaving(false);
  }

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Durchschnitts-Rating */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-anthrazit">Bewertungen</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating value={Math.round(avgRating)} readonly size="sm" />
            <span className="text-sm font-medium text-anthrazit">
              {avgRating}
            </span>
            <span className="text-xs text-muted-foreground">
              ({reviews.length} Bewertung{reviews.length !== 1 ? "en" : ""})
            </span>
          </div>
        )}
      </div>

      {/* Bestehende Bewertungen */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-border bg-white p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-anthrazit">
                    {review.user?.display_name ?? "Nachbar"}
                  </span>
                  <StarRating value={review.rating} readonly size="sm" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.created_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
              </div>
              {review.text && (
                <p className="text-sm text-muted-foreground">{review.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bewertungs-Button */}
      {currentUserId && !hasOwnReview && !showForm && (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <Star className="mr-2 h-4 w-4" />
          Bewertung abgeben
        </Button>
      )}

      {/* Bewertungs-Formular */}
      {showForm && (
        <div className="rounded-xl border-2 border-quartier-green/30 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-anthrazit">Ihre Bewertung</p>
          <StarRating value={newRating} onChange={setNewRating} />
          <Textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Kommentar (optional)"
            rows={3}
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setNewRating(0);
                setNewText("");
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={submitReview}
              disabled={saving || newRating === 0}
              className="bg-quartier-green hover:bg-quartier-green-dark"
            >
              <Send className="mr-1 h-4 w-4" />
              {saving ? "Wird gespeichert..." : "Bewertung senden"}
            </Button>
          </div>
        </div>
      )}

      {reviews.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Noch keine Bewertungen.</p>
      )}
    </div>
  );
}
