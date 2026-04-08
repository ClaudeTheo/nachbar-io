// components/care/DailyCheckinBubble.tsx
// Nachbar.io — Subtile Sprechblase fuer den taeglichen Check-in
// Slided nach 5 Sekunden seitlich rein, Nutzer muss antworten
// Session 59: Ersetzt den alten DailyCheckinButton

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { showPointsToast } from "@/components/gamification/PointsToast";

interface CheckinStatusResponse {
  checkinEnabled: boolean;
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
}

type MoodOption = {
  mood: "good" | "neutral" | "bad";
  status: "ok" | "not_well" | "need_help";
  emoji: string;
  label: string;
};

const MOOD_OPTIONS: MoodOption[] = [
  { mood: "good", status: "ok", emoji: "\uD83D\uDE0A", label: "Gut" },
  { mood: "neutral", status: "not_well", emoji: "\uD83D\uDE10", label: "Geht so" },
  { mood: "bad", status: "need_help", emoji: "\uD83D\uDE1F", label: "Nicht gut" },
];

// Zufaellige Begruessung fuer Abwechslung
const GREETINGS = [
  "Hallo! Wie geht es Ihnen heute?",
  "Schön, dass Sie da sind! Wie fühlen Sie sich?",
  "Guten Tag! Wie geht's Ihnen?",
  "Willkommen zurück! Alles in Ordnung bei Ihnen?",
];

export function DailyCheckinBubble() {
  const [phase, setPhase] = useState<
    "loading" | "waiting" | "visible" | "mood" | "submitting" | "thankyou" | "hidden"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Status vom Server laden
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/care/checkin/status");
      if (!res.ok) {
        setPhase("hidden");
        return;
      }
      const data: CheckinStatusResponse = await res.json();

      if (!data.checkinEnabled || data.allCompleted) {
        setPhase("hidden");
      } else {
        setPhase("waiting"); // Wartet auf 5-Sek-Timer
      }
    } catch {
      // Offline → nicht anzeigen
      setPhase("hidden");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // 5-Sekunden-Timer: Sprechblase einblenden
  useEffect(() => {
    if (phase !== "waiting") return;
    timerRef.current = setTimeout(() => {
      setPhase("visible");
    }, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase]);

  // Check-in absenden
  const submitCheckin = async (option: MoodOption) => {
    setPhase("submitting");
    setError(null);

    try {
      const res = await fetch("/api/care/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: option.status, mood: option.mood }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Check-in fehlgeschlagen");
        setPhase("mood");
        return;
      }

      setPhase("thankyou");
      showPointsToast("checkin");

      // Nach 2 Sekunden ausblenden
      setTimeout(() => setPhase("hidden"), 2000);
    } catch {
      setError("Verbindungsfehler");
      setPhase("mood");
    }
  };

  // Nichts anzeigen
  if (phase === "loading" || phase === "waiting" || phase === "hidden") {
    return null;
  }

  const isConsentError = error?.includes("Einwilligung");

  return (
    <>
      {/* Overlay: verdunkelt den Hintergrund, Nutzer muss antworten */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-fade-in"
        style={{ animation: "fadeIn 0.3s ease-out" }}
      />

      {/* Sprechblase — im oberen Drittel des Screens, gut erreichbar */}
      <div
        className="fixed z-50 top-[25%] left-4 right-4 max-w-sm mx-auto"
        style={{
          animation: "slideInRight 0.4s ease-out",
        }}
      >
        <div className="rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
          {/* Sprechblasen-Pfeil (optional, dekorativ) */}
          <div className="px-5 pt-5 pb-3">
            {/* Lotsen-Avatar + Begruessung */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#4CAF87] text-white text-lg">
                🏘️
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Quartier-Lotse</p>
                <p className="text-base text-[#2D3142] font-medium mt-0.5">
                  {phase === "thankyou" ? "Danke! Schön, dass Sie sich gemeldet haben. 💚" : greeting}
                </p>
              </div>
            </div>
          </div>

          {/* Fehler */}
          {error && (
            <div className="mx-5 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <p>{error}</p>
              {isConsentError && (
                <Link href="/care/consent" className="mt-1 block font-semibold underline">
                  Jetzt Einwilligung erteilen →
                </Link>
              )}
            </div>
          )}

          {/* Stimmungs-Buttons */}
          {(phase === "visible" || phase === "mood" || phase === "submitting") && (
            <div className="px-5 pb-5 pt-1">
              <div className="grid grid-cols-3 gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.mood}
                    onClick={() => submitCheckin(option)}
                    disabled={phase === "submitting"}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-[#4CAF87]/20 bg-[#4CAF87]/5 px-2 py-3 text-[#2D3142] transition-all hover:border-[#4CAF87] hover:bg-[#4CAF87]/10 active:scale-[0.95] disabled:opacity-50"
                    style={{ minHeight: "72px", touchAction: "manipulation" }}
                    data-testid={`mood-${option.mood}`}
                  >
                    <span className="text-2xl" aria-hidden="true">{option.emoji}</span>
                    <span className="mt-1 text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Danke-Zustand — nur kurz sichtbar */}
          {phase === "thankyou" && (
            <div className="px-5 pb-5 pt-1">
              <div className="flex items-center justify-center gap-2 text-[#4CAF87] font-medium">
                <span className="text-xl">✓</span> Einen schönen Tag!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animationen */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
