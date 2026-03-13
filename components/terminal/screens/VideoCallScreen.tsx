"use client";

import { Video, ArrowLeft, Calendar, Phone } from "lucide-react";
import { useTerminal } from "@/lib/terminal/TerminalContext";

/**
 * Video-Sprechstunde Platzhalter-Screen.
 * Vorbereitet fuer WebRTC-Integration (Telemedizin).
 * Zeigt aktuell: naechsten Termin, Kamera-Status, Kontakt-Info.
 *
 * Zukuenftiges Feature: Echte WebRTC-Verbindung mit Arztpraxis.
 */
export default function VideoCallScreen() {
  const { setActiveScreen } = useTerminal();

  return (
    <div className="flex flex-col h-full">
      {/* Header mit Zurueck-Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveScreen("home")}
          aria-label="Zurueck zur Startseite"
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-anthrazit/10 text-anthrazit active:scale-95"
        >
          <ArrowLeft className="h-7 w-7" />
        </button>
        <h1 className="text-3xl font-bold text-anthrazit">Sprechstunde</h1>
      </div>

      {/* Hauptbereich */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {/* Kamera-Vorschau Platzhalter */}
        <div className="flex h-[280px] w-[420px] flex-col items-center justify-center gap-4 rounded-2xl bg-anthrazit/5 border-2 border-dashed border-anthrazit/20">
          <Video className="h-20 w-20 text-anthrazit/30" />
          <p className="text-xl text-anthrazit/50 font-medium">
            Kamera-Vorschau
          </p>
          <p className="text-sm text-anthrazit/40">
            Wird aktiviert wenn ein Termin beginnt
          </p>
        </div>

        {/* Naechster Termin */}
        <div className="flex items-center gap-4 rounded-2xl bg-info-blue/10 px-8 py-5">
          <Calendar className="h-10 w-10 text-info-blue" />
          <div>
            <p className="text-xl font-bold text-anthrazit">
              Kein Termin geplant
            </p>
            <p className="text-lg text-anthrazit/60">
              Ihr Arzt kann einen Termin fuer Sie einrichten
            </p>
          </div>
        </div>

        {/* Arztpraxis kontaktieren */}
        <div className="flex items-center gap-4 rounded-2xl bg-quartier-green/10 px-8 py-5">
          <Phone className="h-10 w-10 text-quartier-green" />
          <div>
            <p className="text-xl font-bold text-anthrazit">
              Praxis kontaktieren
            </p>
            <p className="text-lg text-anthrazit/60">
              Rufen Sie Ihre Arztpraxis an fuer einen Termin
            </p>
          </div>
        </div>

        {/* Hinweis */}
        <p className="text-base text-anthrazit/40 text-center max-w-md">
          Die Online-Sprechstunde wird in einer zukuenftigen Version
          mit Kamera und Mikrofon verfuegbar sein.
        </p>
      </div>
    </div>
  );
}
