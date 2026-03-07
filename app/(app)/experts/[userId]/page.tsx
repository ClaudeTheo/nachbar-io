"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  MessageCircle,
  Shield,
  Calendar,
  Send,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { SKILL_CATEGORIES, TRUST_LEVELS } from "@/lib/constants";
import type { Skill, ExpertReview, ExpertEndorsement, User } from "@/lib/supabase/types";

export default function ExpertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertUserId = params.userId as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expert, setExpert] = useState<User | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [endorsements, setEndorsements] = useState<ExpertEndorsement[]>([]);
  const [loading, setLoading] = useState(true);

  // Bewertungs-Formular
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewCategory, setReviewCategory] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Eigene Bewertungen/Empfehlungen
  const [myReviews, setMyReviews] = useState<Set<string>>(new Set()); // Set von skill_category
  const [myEndorsements, setMyEndorsements] = useState<Set<string>>(new Set());
  const [endorsing, setEndorsing] = useState(false);

  // Reviews auf-/zuklappen
  const [showAllReviews, setShowAllReviews] = useState(false);

  const isOwnProfile = currentUserId === expertUserId;

  const loadExpertData = useCallback(async () => {
    const supabase = createClient();

    // Aktuellen User holen
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Experten-Profil laden
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", expertUserId)
      .single();
    if (userData) setExpert(userData as User);

    // Oeffentliche Skills laden
    const { data: skillsData } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", expertUserId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    if (skillsData) setSkills(skillsData as Skill[]);

    // Reviews laden (mit Reviewer-Name)
    const { data: reviewsData } = await supabase
      .from("expert_reviews")
      .select("*, reviewer:users!expert_reviews_reviewer_user_id_fkey(display_name, avatar_url)")
      .eq("expert_user_id", expertUserId)
      .order("created_at", { ascending: false });
    if (reviewsData) {
      setReviews(reviewsData as unknown as ExpertReview[]);

      // Eigene Reviews tracken
      if (user) {
        const myRevCats = new Set(
          reviewsData
            .filter((r: { reviewer_user_id: string }) => r.reviewer_user_id === user.id)
            .map((r: { skill_category: string }) => r.skill_category)
        );
        setMyReviews(myRevCats);
      }
    }

    // Endorsements laden
    const { data: endorsementsData } = await supabase
      .from("expert_endorsements")
      .select("*, endorser:users!expert_endorsements_endorser_user_id_fkey(display_name, avatar_url)")
      .eq("expert_user_id", expertUserId)
      .order("created_at", { ascending: false });
    if (endorsementsData) {
      setEndorsements(endorsementsData as unknown as ExpertEndorsement[]);

      // Eigene Endorsements tracken
      if (user) {
        const myEndCats = new Set(
          endorsementsData
            .filter((e: { endorser_user_id: string }) => e.endorser_user_id === user.id)
            .map((e: { skill_category: string }) => e.skill_category)
        );
        setMyEndorsements(myEndCats);
      }
    }

    setLoading(false);
  }, [expertUserId]);

  useEffect(() => {
    loadExpertData();
  }, [loadExpertData]);

  // Bewertung abschicken
  async function handleSubmitReview() {
    if (!currentUserId || !reviewCategory || reviewRating === 0) return;
    setSubmittingReview(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("expert_reviews").insert({
        expert_user_id: expertUserId,
        reviewer_user_id: currentUserId,
        skill_category: reviewCategory,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });

      if (error) {
        console.error("Bewertungsfehler:", error);
        setSubmittingReview(false);
        return;
      }

      // Daten neu laden
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewComment("");
      setReviewCategory("");
      await loadExpertData();
    } catch {
      console.error("Netzwerkfehler");
    }
    setSubmittingReview(false);
  }

  // Empfehlung toggen
  async function handleToggleEndorsement(skillCategory: string) {
    if (!currentUserId || isOwnProfile) return;
    setEndorsing(true);

    try {
      const supabase = createClient();
      const isEndorsed = myEndorsements.has(skillCategory);

      if (isEndorsed) {
        // Empfehlung zuruecknehmen
        await supabase
          .from("expert_endorsements")
          .delete()
          .eq("expert_user_id", expertUserId)
          .eq("endorser_user_id", currentUserId)
          .eq("skill_category", skillCategory);
      } else {
        // Empfehlung abgeben
        await supabase.from("expert_endorsements").insert({
          expert_user_id: expertUserId,
          endorser_user_id: currentUserId,
          skill_category: skillCategory,
        });
      }

      await loadExpertData();
    } catch {
      console.error("Empfehlungsfehler");
    }
    setEndorsing(false);
  }

  // Kontakt herstellen (DM oeffnen)
  async function handleContact() {
    if (!currentUserId || isOwnProfile) return;

    const supabase = createClient();

    // Bestehende Konversation suchen
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${currentUserId},participant_2.eq.${expertUserId}),and(participant_1.eq.${expertUserId},participant_2.eq.${currentUserId})`
      )
      .maybeSingle();

    if (existing) {
      router.push(`/messages/${existing.id}`);
    } else {
      // Neue Konversation erstellen
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          participant_1: currentUserId,
          participant_2: expertUserId,
        })
        .select("id")
        .single();
      if (newConv) {
        router.push(`/messages/${newConv.id}`);
      }
    }
  }

  // Aggregate berechnen
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 rounded animate-shimmer" />
        <div className="h-32 rounded-xl animate-shimmer" />
        <div className="h-24 rounded-xl animate-shimmer" />
        <div className="h-48 rounded-xl animate-shimmer" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Experte nicht gefunden.</p>
        <Link href="/experts" className="mt-3 inline-block text-sm text-quartier-green hover:underline">
          Zurueck zur Übersicht
        </Link>
      </div>
    );
  }

  const trustInfo = TRUST_LEVELS[expert.trust_level as keyof typeof TRUST_LEVELS];
  const memberSince = new Date(expert.created_at).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/experts" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-anthrazit">Experten-Profil</h1>
      </div>

      {/* Profil-Header */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-quartier-green/10 text-2xl font-bold text-quartier-green">
            {expert.display_name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-anthrazit">
                {expert.display_name}
              </h2>
              {(expert.trust_level === "verified" ||
                expert.trust_level === "trusted" ||
                expert.trust_level === "admin") && (
                <Shield className="h-5 w-5 text-quartier-green" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {trustInfo && (
                <Badge variant="outline" className="text-xs">
                  {trustInfo.label}
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Seit {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Stats-Zeile */}
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-lightgray p-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-alert-amber text-alert-amber" />
              <span className="text-lg font-bold text-anthrazit">
                {avgRating !== null ? avgRating.toFixed(1) : "—"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Bewertung</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <ThumbsUp className="h-4 w-4 text-quartier-green" />
              <span className="text-lg font-bold text-anthrazit">
                {endorsements.length}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Empfehlungen</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageCircle className="h-4 w-4 text-info-blue" />
              <span className="text-lg font-bold text-anthrazit">
                {reviews.length}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Bewertungen</p>
          </div>
        </div>
      </div>

      {/* Kompetenzen */}
      <section>
        <h3 className="mb-3 font-semibold text-anthrazit">Kompetenzen</h3>
        <div className="space-y-2">
          {skills.map((skill) => {
            const cat = SKILL_CATEGORIES.find((c) => c.id === skill.category);
            const endorseCount = endorsements.filter(
              (e) => e.skill_category === skill.category
            ).length;
            const isEndorsedByMe = myEndorsements.has(skill.category);

            return (
              <div
                key={skill.id}
                className="rounded-xl border border-border bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{cat?.icon ?? "❓"}</span>
                    <div>
                      <h4 className="font-semibold text-anthrazit">
                        {cat?.label ?? skill.category}
                      </h4>
                      {skill.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {skill.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Empfehlen-Button (nicht fuer eigenes Profil) */}
                  {!isOwnProfile && (
                    <button
                      onClick={() => handleToggleEndorsement(skill.category)}
                      disabled={endorsing}
                      className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        isEndorsedByMe
                          ? "bg-quartier-green text-white"
                          : "border border-quartier-green text-quartier-green hover:bg-quartier-green/10"
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {isEndorsedByMe ? "Empfohlen" : "Empfehlen"}
                      {endorseCount > 0 && (
                        <span className="ml-0.5">({endorseCount})</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Aktions-Buttons (nicht fuer eigenes Profil) */}
      {!isOwnProfile && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowReviewForm(!showReviewForm)}
            variant="outline"
            className="flex items-center gap-2 rounded-xl py-5"
          >
            <Star className="h-4 w-4 text-alert-amber" />
            Bewerten
          </Button>
          <Button
            onClick={handleContact}
            className="flex items-center gap-2 rounded-xl py-5 bg-quartier-green hover:bg-quartier-green-dark"
          >
            <MessageCircle className="h-4 w-4" />
            Kontaktieren
          </Button>
        </div>
      )}

      {/* Bewertungsformular */}
      {showReviewForm && !isOwnProfile && (
        <div className="rounded-xl border-2 border-quartier-green bg-quartier-green/5 p-4 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-anthrazit">Neue Bewertung</h3>
            <button
              onClick={() => setShowReviewForm(false)}
              className="rounded-lg p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Kategorie waehlen */}
          <div>
            <label className="text-sm font-medium text-anthrazit">
              Fuer welche Kompetenz?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills
                .filter((s) => !myReviews.has(s.category))
                .map((skill) => {
                  const cat = SKILL_CATEGORIES.find(
                    (c) => c.id === skill.category
                  );
                  return (
                    <button
                      key={skill.id}
                      onClick={() => setReviewCategory(skill.category)}
                      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                        reviewCategory === skill.category
                          ? "bg-quartier-green text-white"
                          : "bg-white border border-border text-anthrazit hover:border-quartier-green"
                      }`}
                    >
                      {cat?.icon} {cat?.label}
                    </button>
                  );
                })}
            </div>
            {skills.filter((s) => !myReviews.has(s.category)).length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground italic">
                Sie haben bereits alle Kompetenzen bewertet.
              </p>
            )}
          </div>

          {reviewCategory && (
            <>
              {/* Sterne */}
              <div>
                <label className="text-sm font-medium text-anthrazit">
                  Bewertung
                </label>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="rounded p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (reviewHover || reviewRating)
                            ? "fill-alert-amber text-alert-amber"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Kommentar */}
              <div>
                <label className="text-sm font-medium text-anthrazit">
                  Kommentar (optional)
                </label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Beschreiben Sie Ihre Erfahrung..."
                  rows={3}
                  maxLength={500}
                  className="mt-2"
                />
              </div>

              {/* Absenden */}
              <Button
                onClick={handleSubmitReview}
                disabled={submittingReview || reviewRating === 0}
                className="w-full bg-quartier-green hover:bg-quartier-green-dark"
              >
                {submittingReview ? (
                  "Wird gespeichert..."
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Bewertung abschicken
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Bewertungen */}
      {reviews.length > 0 && (
        <section>
          <h3 className="mb-3 font-semibold text-anthrazit">
            Bewertungen ({reviews.length})
          </h3>
          <div className="space-y-3">
            {visibleReviews.map((review) => {
              const cat = SKILL_CATEGORIES.find(
                (c) => c.id === review.skill_category
              );
              const reviewer = review.reviewer as unknown as Pick<
                User,
                "display_name" | "avatar_url"
              > | null;

              return (
                <div
                  key={review.id}
                  className="rounded-xl border border-border bg-white p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lightgray text-xs font-bold text-anthrazit">
                        {reviewer?.display_name?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-anthrazit">
                          {reviewer?.display_name ?? "Unbekannt"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("de-DE")}
                          {cat && (
                            <> · {cat.icon} {cat.label}</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Sterne */}
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= review.rating
                              ? "fill-alert-amber text-alert-amber"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mehr anzeigen */}
          {reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-sm text-quartier-green hover:bg-quartier-green/5 transition-colors"
            >
              {showAllReviews ? (
                <>
                  Weniger anzeigen <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Alle {reviews.length} Bewertungen anzeigen{" "}
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </section>
      )}

      {/* Leerer Bewertungs-Zustand */}
      {reviews.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Noch keine Bewertungen vorhanden.
          </p>
          {!isOwnProfile && (
            <p className="mt-1 text-xs text-muted-foreground">
              Seien Sie der Erste, der eine Bewertung abgibt!
            </p>
          )}
        </div>
      )}

      {/* Eigenes Profil: Hinweis */}
      {isOwnProfile && (
        <div className="rounded-xl border border-info-blue/30 bg-info-blue/5 p-4">
          <p className="text-sm text-info-blue font-medium">
            Das ist Ihr eigenes Experten-Profil.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Andere Nachbarn können Sie hier finden, bewerten und kontaktieren.
            Verwalten Sie Ihre Kompetenzen unter{" "}
            <Link href="/profile/skills" className="text-quartier-green hover:underline">
              Profil → Kompetenzen
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
