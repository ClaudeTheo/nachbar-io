// app/(kiosk)/kiosk/layout.tsx
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./kiosk.css";

export const metadata: Metadata = {
  title: "Nachbar Kiosk — Ihr digitaler Begleiter",
  description: "Quartier-Terminal für Senioren: Nachrichten, Radio, Gesundheit, KI-Begleiter",
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
