"use client";

import { useState, useEffect, useCallback } from "react";
import { Smile, Meh, Frown, CircleCheck, ArrowLeft } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

/**
 * Check-in Screen: Stimmungsabfrage fuer Senioren-Terminal.
 * 3 grosse Smiley-Buttons (Gut / Geht so / Schlecht).
 * State-Machine: idle -> sending -> done (mit Auto-Rueckkehr nach 5s).
 */

type CheckinState = "idle" | "sending" | "done";

export default function CheckinScreen() {
  const { sendCheckin, setActiveScreen } = useTerminal();
  const [state, setState] = useState<CheckinState>("idle");

  // Nach erfolgreichem Check-in: 5 Sekunden warten, dann zurueck zur Startseite
  useEffect(() => {
    if (state !== "done") return;

    const timer = setTimeout(() => {
      setActiveScreen("home");
    }, 5000);

    return () => clearTimeout(timer);
  }, [state, setActiveScreen]);

  // Check-in absenden
  const handleCheckin = useCallback(async () => {
    if (state === "sending") return;

    setState("sending");
    try {
      await sendCheckin();
      setState("done");
    } catch {
      // Bei Fehler zurueck auf idle, damit erneut geklickt werden kann
      setState("idle");
    }
  }, [state, sendCheckin]);

  // Erfolgs-Ansicht nach Check-in
  if (state === "done") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
        <CircleCheck className="h-40 w-40 text-success-green" />
        <p className="text-5xl font-bold text-anthrazit">
          Vielen Dank!
        </p>
        <p className="text-[28px] text-anthrazit/70">
          Sie werden automatisch weitergeleitet...
        </p>
        <button
          onClick={() => setActiveScreen("home")}
          className="mt-4 rounded-xl bg-quartier-green px-10 py-5 text-[28px] font-bold text-white shadow-lg transition-transform active:scale-95"
        >
          Zurueck zur Startseite
        </button>
      </div>
    );
  }

  // Haupt-Ansicht: Stimmungsabfrage
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 p-8 relative">
      {/* Zurueck-Button oben links */}
      <button
        onClick={() => setActiveScreen("home")}
        className="absolute top-0 left-0 flex h-[70px] w-[70px] items-center justify-center rounded-xl text-anthrazit/70 transition-colors active:bg-anthrazit/10"
        aria-label="Zurueck zur Startseite"
      >
        <ArrowLeft className="h-10 w-10" />
      </button>

      <h1 className="text-4xl font-bold text-anthrazit">
        Wie geht es Ihnen heute?
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-8">
        {/* Gut — gruener Smiley */}
        <button
          onClick={handleCheckin}
          disabled={state === "sending"}
          aria-label="Gut"
          className="flex h-[260px] w-[260px] flex-col items-center justify-center gap-5 rounded-3xl bg-quartier-green text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          <Smile className="h-20 w-20" />
          <span className="text-3xl font-bold leading-tight text-center">
            Gut
          </span>
        </button>

        {/* Geht so — gelber neutraler Smiley */}
        <button
          onClick={handleCheckin}
          disabled={state === "sending"}
          aria-label="Geht so"
          className="flex h-[260px] w-[260px] flex-col items-center justify-center gap-5 rounded-3xl bg-alert-amber text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          <Meh className="h-20 w-20" />
          <span className="text-3xl font-bold leading-tight text-center">
            Geht so
          </span>
        </button>

        {/* Schlecht — roter trauriger Smiley */}
        <button
          onClick={handleCheckin}
          disabled={state === "sending"}
          aria-label="Schlecht"
          className="flex h-[260px] w-[260px] flex-col items-center justify-center gap-5 rounded-3xl bg-emergency-red text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          <Frown className="h-20 w-20" />
          <span className="text-3xl font-bold leading-tight text-center">
            Schlecht
          </span>
        </button>
      </div>

      {state === "sending" && (
        <p className="text-[28px] text-anthrazit/70 animate-pulse">
          Wird gesendet...
        </p>
      )}
    </div>
  );
}
