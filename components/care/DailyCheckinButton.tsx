// components/care/DailyCheckinButton.tsx
// Nachbar.io — Prominenter "Mir geht's gut" Check-in Button für das Dashboard
// Seniorenmodus: 80px Touch-Targets, 4.5:1 Kontrast, touch-manipulation

"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";

// Check-in-Status-Antwort vom Server
interface CheckinStatusResponse {
  checkinEnabled: boolean;
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
}

// Stimmungs-Optionen für die Auswahl
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

export function DailyCheckinButton() {
  const [phase, setPhase] = useState<"loading" | "pending" | "mood" | "submitting" | "done">("loading");
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [checkinEnabled, setCheckinEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status vom Server laden
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/care/checkin/status");
      if (!res.ok) {
        // Kein Care-Profil vorhanden → Button nicht anzeigen
        setCheckinEnabled(false);
        setPhase("done");
        return;
      }
      const data: CheckinStatusResponse = await res.json();
      setCheckinEnabled(data.checkinEnabled);
      setCompletedCount(data.completedCount);
      setTotalCount(data.totalCount);

      if (!data.checkinEnabled) {
        setPhase("done");
      } else if (data.allCompleted) {
        setPhase("done");
      } else {
        setPhase("pending");
      }
    } catch {
      // Netzwerkfehler → Button trotzdem anzeigen (Offline-Resilient)
      setCheckinEnabled(true);
      setPhase("pending");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, [loadStatus]);

  // Stimmungs-Auswahl senden
  const submitCheckin = async (option: MoodOption) => {
    setPhase("submitting");
    setError(null);

    try {
      const res = await fetch("/api/care/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: option.status,
          mood: option.mood,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Check-in fehlgeschlagen");
        setPhase("mood");
        return;
      }

      // Erfolg: Status aktualisieren
      setCompletedCount((prev) => prev + 1);
      setPhase("done");
    } catch {
      setError("Verbindungsfehler");
      setPhase("mood");
    }
  };

  // Nicht anzeigen wenn Check-in nicht aktiviert oder beim Laden
  if (phase === "loading" || !checkinEnabled) {
    return null;
  }

  // Fehler-Meldung (wird über dem aktuellen State angezeigt)
  const errorBanner = error ? (
    <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {error}
    </p>
  ) : null;

  // Zustand: Alle Check-ins erledigt
  if (phase === "done") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border-2 border-[#4CAF87]/30 bg-[#4CAF87]/10 px-4 py-3"
        data-testid="checkin-done"
        role="status"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4CAF87] text-white">
          <Check className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-[#2D3142]">Check-in erledigt</p>
          <p className="text-sm text-[#2D3142]/70">
            {completedCount} von {totalCount} heute abgeschlossen
          </p>
        </div>
      </div>
    );
  }

  // Zustand: Stimmungsauswahl anzeigen
  if (phase === "mood" || phase === "submitting") {
    return (
      <div data-testid="checkin-mood" className="space-y-2">
        {errorBanner}
        <p className="text-sm font-medium text-[#2D3142]">Wie fühlen Sie sich?</p>
        <div className="grid grid-cols-3 gap-2">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.mood}
              onClick={() => submitCheckin(option)}
              disabled={phase === "submitting"}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-[#4CAF87]/20 bg-white px-2 py-3 text-[#2D3142] shadow-sm transition-all hover:border-[#4CAF87] hover:bg-[#4CAF87]/5 active:scale-[0.97] disabled:opacity-50"
              style={{ minHeight: "80px", touchAction: "manipulation" }}
              data-testid={`mood-${option.mood}`}
            >
              <span className="text-2xl" aria-hidden="true">{option.emoji}</span>
              <span className="mt-1 text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Zustand: Haupt-Button "Mir geht's gut"
  return (
    <div data-testid="checkin-pending">
      {errorBanner}
      <button
        onClick={() => setPhase("mood")}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4CAF87] px-6 py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-[#4CAF87]/90 active:scale-[0.97]"
        style={{ minHeight: "80px", touchAction: "manipulation" }}
        data-testid="checkin-button"
      >
        <Check className="h-6 w-6" aria-hidden="true" />
        Mir geht&apos;s gut
      </button>
    </div>
  );
}
