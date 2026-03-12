"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "@/lib/onboarding";
import { MAP_W, MAP_H, STREET_CODE_TO_NAME, type StreetCode } from "@/lib/map-houses";
import { Button } from "@/components/ui/button";
import { ProgressDots } from "./ProgressDots";
import { ConfettiEffect } from "./ConfettiEffect";

// Slides
import { SlideWelcome } from "./slides/SlideWelcome";
import { SlideEmergency } from "./slides/SlideEmergency";
import { SlideHelp } from "./slides/SlideHelp";
import { SlideMarketplace } from "./slides/SlideMarketplace";
import { SlideMap } from "./slides/SlideMap";
import { SlideCommunity } from "./slides/SlideCommunity";
import { SlidePush } from "./slides/SlidePush";
import { SlideSetPosition } from "./slides/SlideSetPosition";
import { SlideReady } from "./slides/SlideReady";

const TOTAL_SLIDES = 9;
const SWIPE_THRESHOLD = 50;

const BUTTON_LABELS = [
  "Weiter",
  "Weiter",
  "Weiter",
  "Weiter",
  "Weiter",
  "Weiter",
  "Weiter",         // Push-Slide
  "Position speichern",
  "Zum Dashboard",
];

export function OnboardingFlow() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideKey, setSlideKey] = useState(0); // fuer Animations-Reset

  // Karten-Position State
  const [mapPosition, setMapPosition] = useState({ x: Math.round(MAP_W / 2), y: Math.round(MAP_H / 2) });
  const [householdInfo, setHouseholdInfo] = useState<{
    householdId: string;
    streetName: string;
    houseNumber: string;
  } | null>(null);

  // Touch-State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Nutzername + Haushalt laden
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Nutzername
      const { data: profile } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (profile) setDisplayName(profile.display_name);

      // Haushalt laden (fuer Map-Position Speicherung)
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, households(street_name, house_number)")
        .eq("user_id", user.id)
        .not("verified_at", "is", null)
        .limit(1)
        .maybeSingle();

      if (membership) {
        const hh = membership.households as unknown as { street_name: string; house_number: string } | null;
        if (hh) {
          setHouseholdInfo({
            householdId: membership.household_id,
            streetName: hh.street_name,
            houseNumber: hh.house_number,
          });

          // Bestehende Map-Position laden (falls vorhanden)
          const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
            .find(([, name]) => name === hh.street_name)?.[0];
          if (code) {
            const { data: mapHouse } = await supabase
              .from("map_houses")
              .select("x, y")
              .eq("street_code", code)
              .eq("house_number", hh.house_number)
              .maybeSingle();
            if (mapHouse) {
              setMapPosition({ x: mapHouse.x, y: mapHouse.y });
            }
          }
        }
      }
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

    // Kurze Transition
    setTimeout(() => {
      setCurrentSlide(index);
      setSlideKey((k) => k + 1); // Animationen zuruecksetzen
      setIsAnimating(false);
    }, 200);
  }, [currentSlide, isAnimating]);

  // Map-Position in Supabase speichern
  async function saveMapPosition() {
    if (!householdInfo) return;

    const supabase = createClient();
    const code = (Object.entries(STREET_CODE_TO_NAME) as [StreetCode, string][])
      .find(([, name]) => name === householdInfo.streetName)?.[0];
    if (!code) return;

    const mapId = `${code.toLowerCase()}${householdInfo.houseNumber}`;

    // Upsert: Erstellen oder aktualisieren
    const { error } = await supabase
      .from("map_houses")
      .upsert({
        id: mapId,
        house_number: householdInfo.houseNumber,
        street_code: code,
        x: mapPosition.x,
        y: mapPosition.y,
        default_color: "green",
        household_id: householdInfo.householdId,
      }, { onConflict: "id" });

    if (error) {
      console.error("Map-Position konnte nicht gespeichert werden:", error);
    }
  }

  // Onboarding abschliessen
  async function handleComplete() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  // Weiter-Button Handler (speichert Position auf Slide 7)
  async function handleNext() {
    if (currentSlide === 7) {
      // Position speichern beim Verlassen des Position-Slides
      await saveMapPosition();
    }
    goToSlide(currentSlide + 1);
  }

  // Skip
  async function handleSkip() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  // Touch-Handler fuer Swipe
  function onTouchStart(e: React.TouchEvent) {
    // Swipe auf dem Position-Slide deaktivieren (Touch wird fuer Drag gebraucht)
    if (currentSlide === 7) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (currentSlide === 7) return;
    setTouchEnd(e.targetTouches[0].clientX);
  }

  function onTouchEnd() {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;

    if (distance > 0) {
      // Swipe links → naechste Slide
      goToSlide(currentSlide + 1);
    } else {
      // Swipe rechts → vorherige Slide
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
      case 2: return <SlideHelp />;
      case 3: return <SlideMarketplace />;
      case 4: return <SlideMap />;
      case 5: return <SlideCommunity />;
      case 6: return <SlidePush />;
      case 7: return <SlideSetPosition position={mapPosition} onPositionChange={setMapPosition} />;
      case 8: return <SlideReady displayName={displayName} />;
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
        {/* Zurueck */}
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

        {/* Progress-Dots */}
        <ProgressDots
          current={currentSlide}
          total={TOTAL_SLIDES}
          onDotClick={goToSlide}
        />

        {/* Ueberspringen */}
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
          {BUTTON_LABELS[currentSlide]}
        </Button>
      </div>

      {/* Konfetti auf letzter Slide */}
      <ConfettiEffect active={showConfetti} />
    </div>
  );
}
