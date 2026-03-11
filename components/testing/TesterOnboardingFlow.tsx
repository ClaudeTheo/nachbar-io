"use client";

// components/testing/TesterOnboardingFlow.tsx
// Nachbar.io — Tester-Onboarding Carousel (5 Slides)
// Erklaert den Tester-Ablauf, das Testpanel und die Testpfade

import { useState, useCallback } from "react";
import {
  ClipboardList, Navigation, LayoutPanelLeft, Route, Rocket,
  ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, MinusCircle, SkipForward,
  Map, HandHelping, ShoppingBag, Users, MessageCircle, Bell, AlertTriangle, Shield,
} from "lucide-react";
import { useTestMode } from "./TestModeProvider";
import { TEST_PATHS, getTotalEstimatedMinutes, getTotalActivePoints } from "@/lib/testing/test-config";

const TOTAL_SLIDES = 5;

// ============================================================
// Hauptkomponente
// ============================================================

export function TesterOnboardingFlow() {
  const { completeOnboarding, startSession } = useTestMode();
  const [slide, setSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const next = useCallback(() => {
    if (slide < TOTAL_SLIDES - 1) setSlide(s => s + 1);
  }, [slide]);

  const prev = useCallback(() => {
    if (slide > 0) setSlide(s => s - 1);
  }, [slide]);

  // Swipe-Support
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  };

  // Letzte Slide: Session starten
  const handleComplete = async () => {
    completeOnboarding();
    try {
      const deviceType = window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
      await startSession({
        device_type: deviceType,
        browser_info: navigator.userAgent.slice(0, 200),
        started_from_route: window.location.pathname,
      });
    } catch {
      // Session-Start fehlgeschlagen — Onboarding trotzdem abschliessen
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slide-Inhalt */}
        <div className="px-6 pb-4 pt-8">
          {slide === 0 && <SlideWelcome />}
          {slide === 1 && <SlideNavigation />}
          {slide === 2 && <SlideTestPanel />}
          {slide === 3 && <SlideTestPaths />}
          {slide === 4 && <SlideReady />}
        </div>

        {/* Progress-Dots + Navigation */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <button
            onClick={prev}
            disabled={slide === 0}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-anthrazit disabled:invisible"
          >
            <ChevronLeft className="h-4 w-4" /> Zurueck
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === slide ? "w-6 bg-quartier-green" : "w-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {slide < TOTAL_SLIDES - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-1 text-sm font-medium text-quartier-green transition-colors hover:text-quartier-green/80"
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-1 rounded-lg bg-quartier-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-quartier-green/90"
            >
              <Rocket className="h-4 w-4" /> Los geht&apos;s
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Slides
// ============================================================

function SlideWelcome() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-quartier-green/10">
        <ClipboardList className="h-8 w-8 text-quartier-green" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-anthrazit">Willkommen zum Test!</h2>
      <p className="text-sm text-muted-foreground">
        Sie helfen dabei, Nachbar.io fuer alle Nachbarn besser zu machen.
        In den naechsten Minuten fuehren wir Sie durch die App und pruefen gemeinsam alle Funktionen.
      </p>
      <div className="mt-4 rounded-lg bg-quartier-green/5 p-3 text-xs text-quartier-green-dark">
        <strong>Ziel:</strong> Finden Sie Fehler, Unklarheiten und Verbesserungsmoeglichkeiten —
        jede Rueckmeldung zaehlt!
      </div>
    </div>
  );
}

function SlideNavigation() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Navigation className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-anthrazit">App-Bereiche</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Nachbar.io hat verschiedene Module. Sie testen diese systematisch:
      </p>
      <div className="space-y-1.5">
        {[
          { icon: Map, label: "Quartierskarte", desc: "Interaktive Karte mit Hauesern" },
          { icon: HandHelping, label: "Hilfe-Boerse", desc: "Nachbarschaftshilfe anbieten & suchen" },
          { icon: ShoppingBag, label: "Marktplatz", desc: "Angebote, Leihboerse, Wer hat?" },
          { icon: Users, label: "Community", desc: "Pinnwand, Events, Tipps, Umfragen" },
          { icon: MessageCircle, label: "Nachrichten", desc: "Direktnachrichten zwischen Nachbarn" },
          { icon: Bell, label: "Benachrichtigungen", desc: "Push + Benachrichtigungs-Center" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <Icon className="h-4 w-4 shrink-0 text-quartier-green" />
            <div>
              <span className="text-xs font-medium text-anthrazit">{label}</span>
              <span className="ml-1.5 text-[11px] text-muted-foreground">{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTestPanel() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
          <LayoutPanelLeft className="h-5 w-5 text-purple-600" />
        </div>
        <h2 className="text-lg font-bold text-anthrazit">Das Test-Panel</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Waehrend Sie testen, begleitet Sie ein schwebendes Panel. Damit dokumentieren Sie Ihre Ergebnisse:
      </p>
      <div className="space-y-2">
        {[
          { icon: CheckCircle2, color: "text-emerald-600", label: "Bestanden", desc: "Alles funktioniert wie erwartet" },
          { icon: MinusCircle, color: "text-amber-600", label: "Teilweise", desc: "Grundfunktion ok, aber kleine Maengel" },
          { icon: XCircle, color: "text-red-600", label: "Fehlgeschlagen", desc: "Fehler gefunden — bitte beschreiben" },
          { icon: SkipForward, color: "text-gray-500", label: "Uebersprungen", desc: "Kann gerade nicht getestet werden" },
        ].map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className="flex items-start gap-2.5 rounded-lg border px-3 py-2">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
            <div>
              <span className="text-xs font-medium text-anthrazit">{label}</span>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Bei Fehlern koennen Sie zusaetzlich den Schweregrad und die Art des Problems angeben.
      </p>
    </div>
  );
}

function SlideTestPaths() {
  const totalMinutes = getTotalEstimatedMinutes();
  const totalPoints = getTotalActivePoints();

  // Icon-Mapping
  const iconMap: Record<string, typeof Map> = {
    Smartphone: ClipboardList, UserCog: Users, Map, HandHelping,
    ShoppingBag, Users, MessageCircle, Bell, AlertTriangle, Shield,
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <Route className="h-5 w-5 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-anthrazit">Testpfade</h2>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        {totalPoints} Testpunkte in {TEST_PATHS.length} Pfaden — geschaetzt ca. {totalMinutes} Minuten:
      </p>
      <div className="space-y-1">
        {TEST_PATHS.map((path, i) => {
          const Icon = iconMap[path.icon] ?? ClipboardList;
          return (
            <div key={path.id} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
              <Icon className="h-3.5 w-3.5 shrink-0 text-quartier-green" />
              <span className="flex-1 text-xs text-anthrazit">{path.name}</span>
              <span className="text-[10px] text-muted-foreground">{path.points.filter(p => p.active).length}P · {path.estimatedMinutes}m</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Tipp: Sie koennen die Reihenfolge frei waehlen und jederzeit unterbrechen. Ihr Fortschritt wird automatisch gespeichert.
      </p>
    </div>
  );
}

function SlideReady() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
        <Rocket className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-anthrazit">Bereit zum Testen!</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Tippen Sie auf &quot;Los geht&apos;s&quot; — Ihre Test-Session wird gestartet und das
        Test-Panel erscheint. Navigieren Sie dann frei durch die App und dokumentieren
        Sie Ihre Ergebnisse.
      </p>
      <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-left text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-quartier-green" />
          <span>Fortschritt wird automatisch gespeichert</span>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-quartier-green" />
          <span>Sie koennen jederzeit unterbrechen und spaeter weitermachen</span>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-quartier-green" />
          <span>Das Panel kann minimiert werden — die App funktioniert normal</span>
        </div>
      </div>
    </div>
  );
}
