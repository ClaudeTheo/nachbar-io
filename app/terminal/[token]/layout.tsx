"use client";

import { use, type ReactNode } from "react";
import TerminalHeader from "@/components/terminal/TerminalHeader";
import TerminalSidebar from "@/components/terminal/TerminalSidebar";
import { TerminalProvider } from "@/lib/terminal/TerminalContext";
import { NightModeGate } from "@/components/terminal/NightModeGate";
import ScreensaverOverlay from "@/components/terminal/ScreensaverOverlay";
import AppointmentPopup from "@/components/terminal/AppointmentPopup";

/**
 * Terminal-Layout: Vollbild fuer 10" Kiosk-Display (1280x800).
 * Links: Header + Hauptinhalt (flex-1), Rechts: Sidebar (140px).
 * TerminalProvider stellt Daten und Navigation fuer alle Kinder bereit.
 */
export default function TerminalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  // In Next.js 16 App Router sind params ein Promise
  const { token } = use(params);

  return (
    <TerminalProvider token={token}>
      <div className="flex h-screen w-screen overflow-hidden bg-warmwhite">
        {/* Hauptbereich: Header oben + Inhalt darunter */}
        <div className="flex flex-col flex-1 min-w-0">
          <TerminalHeader />
          <main className="flex-1 overflow-hidden p-4">
            {children}
          </main>
        </div>

        {/* Sidebar rechts, immer sichtbar */}
        <TerminalSidebar />
      </div>

      {/* Screensaver nach 5 Min. Inaktivitaet (z-40) */}
      <ScreensaverOverlay />

      {/* Termin-Popup 15 Min. vor Termin (z-45) */}
      <AppointmentPopup />

      {/* Nachtmodus-Overlay (22:00–07:00), ueberlagert alles (z-50) */}
      <NightModeGate />
    </TerminalProvider>
  );
}
