// app/(senior)/layout.tsx
import type { ReactNode } from "react";
import { PushBanner } from "@/components/senior/PushBanner";
import { RefreshRotationMounter } from "@/components/senior/RefreshRotationMounter";
import { BugReportButton } from "@/components/BugReportButton";
import { GlobalCallListener } from "@/components/video/GlobalCallListener";
import { SeniorScreensaver } from "@/modules/care/components/senior/SeniorScreensaver";
import { QuarterProvider } from "@/lib/quarters";

export const metadata = {
  title: "QuartierApp — Senioren-Gerät",
};

/**
 * Layout fuer das stationaere Senioren-Geraet (E-Ink-optimiert).
 * Stark vereinfacht: Kein BottomNav, grosse Schrift, hoher Kontrast.
 */
export default function SeniorDeviceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QuarterProvider>
      <div
        className="min-h-screen bg-white text-anthrazit"
        style={{
          // E-Ink-optimiert: Kein Gradient, kein Schatten, hoher Kontrast.
          // Befund B3:6: rem statt px, damit die System-/Browser-Schriftgroesse
          // (Senioren-Einstellung "groessere Schrift") proportional mit skaliert.
          fontSize: "1.25rem",
          lineHeight: "1.6",
        }}
      >
        <RefreshRotationMounter />
        {/* Eingehende Videoanrufe auch auf dem Senioren-Gerät anzeigen (S2-5 / C2:4) —
            Fullscreen-Overlay mit 80px Annehmen/Ablehnen. */}
        <GlobalCallListener />
        {/* SB-3: Foto-Karussell als Ruhezustand (nach 5 Min. Inaktivitaet, Tap beendet). */}
        <SeniorScreensaver />
        <main className="mx-auto max-w-md px-6 pb-36 pt-8">
          <PushBanner />
          {children}
        </main>

        {/* Notruf bleibt auf dem Senior-Start dauerhaft erreichbar. */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-red-200 bg-white safe-bottom">
          <div className="mx-auto max-w-md px-4 py-3">
            <a
              href="tel:112"
              className="flex items-center justify-center rounded-2xl bg-red-900 px-6 text-center text-2xl font-bold text-white shadow-soft focus:outline-none focus:ring-4 focus:ring-red-300"
              style={{ minHeight: "80px", touchAction: "manipulation" }}
              aria-label="Notruf 112 anrufen"
            >
              Notruf 112
            </a>
          </div>
        </div>

        <BugReportButton senior />
      </div>
    </QuarterProvider>
  );
}
