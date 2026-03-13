"use client";

import { Phone, X } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

/**
 * Notruf-Screen: Vollbild-Overlay fuer den Notfall.
 * KRITISCH: Zeigt IMMER 112/110 prominent an.
 * Telefon-Link oeffnet direkt den Notruf.
 */
export default function EmergencyScreen() {
  const { setActiveScreen } = useTerminal();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emergency-red p-8">
      {/* Schliessen-Button oben rechts */}
      <button
        onClick={() => setActiveScreen("home")}
        aria-label="Notruf-Bildschirm schliessen"
        className="absolute right-6 top-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
      >
        <X className="h-10 w-10" />
      </button>

      {/* Telefon-Icon mit Puls-Animation */}
      <Phone className="h-32 w-32 animate-pulse text-white" />

      {/* NOTRUF Ueberschrift */}
      <h1 className="mt-6 text-6xl font-black tracking-wider text-white">
        NOTRUF
      </h1>

      {/* Handlungsanweisung */}
      <p className="mt-4 text-2xl font-semibold text-white/90">
        Rufen Sie sofort den Rettungsdienst
      </p>

      {/* 112 Anrufen Button */}
      <a
        href="tel:112"
        className="mt-10 flex min-h-[100px] items-center justify-center rounded-2xl bg-white px-16 py-6 text-4xl font-black text-emergency-red shadow-2xl transition-transform hover:scale-105 active:scale-95"
      >
        112 ANRUFEN
      </a>

      {/* Weitere Notrufnummern */}
      <p className="mt-10 text-xl font-medium text-white/80">
        Polizei: <a href="tel:110" className="underline text-white">110</a>
        {" \u00B7 "}
        Giftnotruf: <a href="tel:076119240" className="underline text-white">0761 19240</a>
      </p>
    </div>
  );
}
