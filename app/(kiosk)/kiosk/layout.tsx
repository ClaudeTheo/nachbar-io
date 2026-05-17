// app/(kiosk)/kiosk/layout.tsx
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./kiosk.css";

export const metadata: Metadata = {
  title: "QuartierApp Kiosk (Archiv)",
  description: "Archivierter Web-Kiosk-Bereich. Im aktuellen Pilot nicht genutzt — die normale QuartierApp ist der Fokus.",
};

export const viewport: Viewport = {
  themeColor: "#f8faf5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Kiosk-Layout: Vollbild, helles fröhliches Theme, kein Header/Footer/Nav.
 * Optimiert für 10.1" Touch-Tablet (AWOW AIBOOK 11, 1280x800).
 * Senior-Modus ist Default: 80px Touch-Targets, 24px Base-Font.
 */
export default function KioskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="kiosk-root">
      {children}
    </div>
  );
}
