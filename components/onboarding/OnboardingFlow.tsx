"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { completeOnboarding } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { ProgressDots } from "./ProgressDots";
import { ConfettiEffect } from "./ConfettiEffect";

// Reduzierte Slides: 4 kontextuelle Funktionen inkl. Video
import { SlideWelcome } from "./slides/SlideWelcome";
import { SlideEmergency } from "./slides/SlideEmergency";
import SlideVideo from "./slides/SlideVideo";
import { SlideReady } from "./slides/SlideReady";
import { SlideSkills } from "./SlideSkills";

const TOTAL_SLIDES = 5;
const SWIPE_THRESHOLD = 50;

const BUTTON_LABELS = [
  "Weiter",           // Willkommen
  "Verstanden",       // Notfall-System
  "Weiter",           // Hilfsangebote
  "Weiter",           // Video
  "Zum Dashboard",    // Fertig
];

/**
 * Reduzierter OnboardingFlow (3 Slides statt 9)
 *
 * Konzept: Nur das Wichtigste zeigen — den Rest entdeckt der Nutzer selbst.
 * 1. Willkommen (personalisiert)
 * 2. Notfall-System (KRITISCH — muss jeder kennen)
 * 3. Promo-Video (emotionaler Einstieg)
 * 4. Fertig (mit Konfetti)
 *
 * Die restlichen Funktionen (Marktplatz, Karte, Community, Push, Position)
 * werden kontextuell im Dashboard erklaert, wenn der Nutzer sie erstmals aufruft.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(skillId: string) {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(s => s !== skillId)
        : [...prev, skillId]
    );
  }

  // Touch-State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Nutzername laden
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { user } = await getCachedUser(supabase);
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (profile) setDisplayName(profile.display_name);
    }
    loadData();
  }, []);

  // Slide-Navigation
  const goToSlide = useCallback((index: number) => {
    if (isAnimating || index === currentSlide) return;
    if (index < 0 || index >= TOTAL_SLIDES) return;

    setIsAnimating(true);

    // Konfetti auf letzter Slide
    if (index === TOTAL_SLIDES - 1) {
      setTimeout(() => setShowConfetti(true), 400);
    } else {
      setShowConfetti(false);
    }

    setTimeout(() => {
      setCurrentSlide(index);
      setSlideKey((k) => k + 1);
      setIsAnimating(false);
    }, 200);
  }, [currentSlide, isAnimating]);

  // Onboarding abschliessen
  async function handleComplete() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  // Weiter-Button Handler
  async function handleNext() {
    // Skills speichern beim Verlassen der Hilfsangebote-Slide
    if (currentSlide === 2 && selectedSkills.length > 0) {
      try {
        const supabase = createClient();
        const { user } = await getCachedUser(supabase);
        if (user) {
          const { data: membership } = await supabase
            .from("quarter_memberships")
            .select("quarter_id")
            .eq("user_id", user.id)
            .single();

          if (membership) {
            const inserts = selectedSkills.map(cat => ({
              user_id: user.id,
              quarter_id: membership.quarter_id,
              category: cat,
              is_public: true,
            }));
            await supabase.from("skills").upsert(inserts, {
              onConflict: "user_id,category",
              ignoreDuplicates: true,
            });
          }
        }
      } catch {
        // Nicht-blockierend — Skills koennen spaeter nachgetragen werden
      }
    }
    goToSlide(currentSlide + 1);
  }

  // Ueberspringen
  async function handleSkip() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  // Touch-Handler fuer Swipe
  function onTouchStart(e: React.TouchEvent) {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function onTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function onTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;

    if (distance > 0) {
      goToSlide(currentSlide + 1);
    } else {
      goToSlide(currentSlide - 1);
    }
  }

  // Keyboard-Navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, goToSlide]);

  const isLast = currentSlide === TOTAL_SLIDES - 1;

  // Aktuelle Slide rendern
  function renderSlide() {
    switch (currentSlide) {
      case 0: return <SlideWelcome />;
      case 1: return <SlideEmergency />;
      case 2: return <SlideSkills selectedSkills={selectedSkills} onToggle={toggleSkill} />;
      case 3: return <SlideVideo variant="welcome" />;
      case 4: return <SlideReady displayName={displayName} />;
      default: return null;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FAFAF8] overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top-Bar: Zurueck + Progress + Skip */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 safe-top">
        {currentSlide > 0 ? (
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}

        <ProgressDots
          current={currentSlide}
          total={TOTAL_SLIDES}
          onDotClick={goToSlide}
        />

        {!isLast ? (
          <button
            onClick={handleSkip}
            className="px-2 py-1 text-sm text-muted-foreground hover:text-anthrazit transition-colors"
          >
            Überspringen
          </button>
        ) : (
          <div className="w-[100px]" />
        )}
      </div>

      {/* Slide-Inhalt */}
      <div className="flex-1 overflow-hidden">
        <div
          key={slideKey}
          className={`h-full transition-opacity duration-200 ${isAnimating ? "opacity-0" : "opacity-100"}`}
        >
          {renderSlide()}
        </div>
      </div>

      {/* CTA-Button unten */}
      <div className="px-6 pb-6 pt-3 safe-bottom">
        <Button
          onClick={isLast ? handleComplete : handleNext}
          className={`w-full rounded-xl py-6 text-base font-semibold ${
            isLast ? "animate-glow-pulse" : ""
          }`}
          style={{ minHeight: "56px" }}
        >
          {currentSlide === 2 && selectedSkills.length === 0
            ? "Überspringen"
            : BUTTON_LABELS[currentSlide]}
        </Button>
      </div>

      {/* Konfetti auf letzter Slide */}
      <ConfettiEffect active={showConfetti} />
    </div>
  );
}
