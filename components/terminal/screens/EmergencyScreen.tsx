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
        className="absolute right-8 top-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-white transition-colors"
      >
        <X className="h-12 w-12" />
      </button>

      {/* Telefon-Icon mit Puls-Animation */}
      <Phone className="h-40 w-40 animate-pulse text-white" />

      {/* NOTRUF Ueberschrift */}
      <h1 className="mt-6 text-7xl font-black tracking-wider text-white">
        NOTRUF
      </h1>

      {/* Handlungsanweisung */}
      <p className="mt-4 text-3xl font-semibold text-white/90">
        Rufen Sie sofort den Rettungsdienst
      </p>

      {/* 112 Anrufen Button */}
      <a
        href="tel:112"
        className="mt-10 flex min-h-[120px] items-center justify-center rounded-3xl bg-white px-20 py-8 text-5xl font-black text-emergency-red shadow-2xl transition-transform active:scale-95"
      >
        112 ANRUFEN
      </a>

      {/* Weitere Notrufnummern */}
      <p className="mt-10 text-[28px] font-medium text-white/80">
        Polizei: <a href="tel:110" className="underline text-white">110</a>
        {" \u00B7 "}
        Giftnotruf: <a href="tel:076119240" className="underline text-white">0761 19240</a>
      </p>
    </div>
  );
}
