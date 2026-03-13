"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Frown, AlertTriangle, CheckCircle } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

/**
 * Check-in Screen: Stimmungsabfrage fuer Senioren-Terminal.
 * 3 grosse Buttons (Gut / Nicht so gut / Brauche Hilfe).
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
        <CheckCircle className="h-32 w-32 text-success-green" />
        <p className="text-4xl font-bold text-anthrazit">
          Vielen Dank!
        </p>
        <p className="text-xl text-anthrazit/70">
          Sie werden automatisch weitergeleitet...
        </p>
      </div>
    );
  }

  // Haupt-Ansicht: Stimmungsabfrage
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 p-8">
      <h1 className="text-3xl font-bold text-anthrazit">
        Wie geht es Ihnen heute?
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-6">
        {/* Gut */}
        <button
          onClick={handleCheckin}
          disabled={state === "sending"}
          aria-label="Mir geht es gut"
          className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-4 rounded-2xl bg-success-green text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
        >
          <Heart className="h-16 w-16" />
          <span className="text-2xl font-bold leading-tight text-center">
            Mir geht es gut
          </span>
        </button>

        {/* Nicht so gut */}
        <button
          onClick={handleCheckin}
          disabled={state === "sending"}
          aria-label="Nicht so gut"
          className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-4 rounded-2xl bg-alert-amber text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
        >
          <Frown className="h-16 w-16" />
          <span className="text-2xl font-bold leading-tight text-center">
            Nicht so gut
          </span>
        </button>

        {/* Brauche Hilfe */}
        <button
          onClick={handleCheckin}
          disabled={state === "sending"}
          aria-label="Brauche Hilfe"
          className="flex h-[220px] w-[220px] flex-col items-center justify-center gap-4 rounded-2xl bg-emergency-red text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
        >
          <AlertTriangle className="h-16 w-16" />
          <span className="text-2xl font-bold leading-tight text-center">
            Brauche Hilfe
          </span>
        </button>
      </div>

      {state === "sending" && (
        <p className="text-xl text-anthrazit/70 animate-pulse">
          Wird gesendet...
        </p>
      )}
    </div>
  );
}
