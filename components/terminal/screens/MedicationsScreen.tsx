"use client";

import { useState, useMemo } from "react";
import { Pill, CircleCheck, ArrowLeft, Clock } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

/**
 * Medikamenten-Erinnerungsscreen für das Senioren-Terminal.
 * Zeigt heutige Medikamente mit grossem "Eingenommen"-Toggle.
 * Mock-Daten, da noch keine Medikamenten-API vorhanden.
 */

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
}

// Mock-Daten für die Pilotphase
const INITIAL_MEDICATIONS: Medication[] = [
  { id: "med-1", name: "Metoprolol", dosage: "47,5 mg", time: "08:00", taken: false },
  { id: "med-2", name: "Ramipril", dosage: "5 mg", time: "08:00", taken: false },
  { id: "med-3", name: "Marcumar", dosage: "3 mg", time: "20:00", taken: false },
];

export default function MedicationsScreen() {
  const { setActiveScreen } = useTerminal();
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);

  // Prüfen ob alle Medikamente eingenommen wurden
  const allTaken = useMemo(
    () => medications.every((med) => med.taken),
    [medications]
  );

  // Toggle-Handler für einzelnes Medikament
  const toggleMedication = (id: string) => {
    setMedications((prev) =>
      prev.map((med) =>
        med.id === id ? { ...med, taken: !med.taken } : med
      )
    );
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveScreen("home")}
          aria-label="Zurück zur Startseite"
          className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-anthrazit/10 text-anthrazit transition-transform active:scale-95"
        >
          <ArrowLeft className="h-12 w-12" />
        </button>
        <div className="flex items-center gap-3">
          <Pill className="h-12 w-12 text-anthrazit" />
          <h1 className="text-4xl font-bold text-anthrazit">
            Ihre Medikamente heute
          </h1>
        </div>
      </div>

      {/* Erfolgsmeldung wenn alle eingenommen */}
      {allTaken && (
        <div className="flex items-center gap-4 rounded-2xl bg-quartier-green/15 p-5">
          <CircleCheck className="h-12 w-12 text-quartier-green flex-shrink-0" />
          <p className="text-3xl font-bold text-quartier-green">
            Alle Medikamente eingenommen!
          </p>
        </div>
      )}

      {/* Medikamenten-Liste */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {medications.map((med) => (
          <button
            key={med.id}
            onClick={() => toggleMedication(med.id)}
            aria-label={`${med.name} ${med.dosage} um ${med.time} Uhr${med.taken ? ", bereits eingenommen" : ", noch nicht eingenommen"}`}
            className={`flex items-center gap-5 rounded-2xl p-6 shadow-soft transition-all active:scale-[0.98] min-h-[110px] ${
              med.taken
                ? "bg-quartier-green text-white"
                : "bg-info-blue text-white"
            }`}
          >
            {/* Medikamenten-Info */}
            <div className="flex flex-1 flex-col items-start gap-1">
              <span className="text-3xl font-bold">
                {med.name} — {med.dosage}
              </span>
              <span className="flex items-center gap-2 text-[28px] opacity-90">
                <Clock className="h-7 w-7" />
                {med.time} Uhr
              </span>
            </div>

            {/* Status-Anzeige */}
            <div
              className={`flex h-[80px] w-[220px] items-center justify-center rounded-xl font-bold text-[28px] transition-colors ${
                med.taken
                  ? "bg-white/25 text-white"
                  : "bg-white/20 text-white"
              }`}
            >
              {med.taken ? (
                <span className="flex items-center gap-2">
                  <CircleCheck className="h-8 w-8" />
                  Eingenommen
                </span>
              ) : (
                "Einnehmen"
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Zurück-Button unten */}
      <button
        onClick={() => setActiveScreen("home")}
        className="flex h-[80px] items-center justify-center rounded-2xl bg-quartier-green px-8 text-3xl font-bold text-white shadow-soft transition-transform active:scale-95"
      >
        Zurück zur Startseite
      </button>
    </div>
  );
}
