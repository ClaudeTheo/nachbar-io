"use client";

import { Home, Phone, Smartphone } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

export default function TerminalSidebar() {
  const { activeScreen, setActiveScreen } = useTerminal();

  // TODO Welle 2: "Alle Funktionen" nur anzeigen wenn Angehörige es freischalten
  const showAlleFunktionen = false;

  return (
    <aside className="flex flex-col gap-4 w-[130px] bg-anthrazit p-3 shrink-0">
      {/* Home */}
      <button
        onClick={() => setActiveScreen("home")}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl min-h-[100px] transition-all
          ${activeScreen === "home"
            ? "bg-quartier-green text-white ring-2 ring-white"
            : "bg-anthrazit-light text-white/80 hover:bg-anthrazit-light/80"
          }`}
      >
        <Home className="h-8 w-8" />
        <span className="text-[16px] font-semibold">Home</span>
      </button>

      {/* Wichtige Nummern */}
      <button
        onClick={() => setActiveScreen("emergency-numbers")}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl min-h-[100px] transition-all
          ${activeScreen === "emergency-numbers"
            ? "bg-emergency-red text-white ring-2 ring-white"
            : "bg-emergency-red/80 text-white hover:bg-emergency-red"
          }`}
      >
        <Phone className="h-8 w-8" />
        <span className="text-[14px] font-semibold text-center leading-tight">Wichtige Nummern</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Alle Funktionen (optional, durch Angehörige freigeschaltet) */}
      {showAlleFunktionen && (
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl min-h-[100px] bg-anthrazit-light text-white/70 hover:bg-anthrazit-light/80 transition-all"
        >
          <Smartphone className="h-8 w-8" />
          <span className="text-[13px] font-semibold text-center leading-tight">Alle Funkt.</span>
        </button>
      )}
    </aside>
  );
}
