// app/(senior)/layout.tsx
import type { ReactNode } from "react";
import { PushBanner } from "@/components/senior/PushBanner";
import { RefreshRotationMounter } from "@/components/senior/RefreshRotationMounter";

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
    <div
      className="min-h-screen bg-white text-anthrazit"
      style={{
        // E-Ink-optimiert: Kein Gradient, kein Schatten, hoher Kontrast
        fontSize: "20px",
        lineHeight: "1.6",
      }}
    >
      <RefreshRotationMounter />
      <main className="mx-auto max-w-md px-6 py-8">
        <PushBanner />
        {children}
      </main>
    </div>
  );
}
