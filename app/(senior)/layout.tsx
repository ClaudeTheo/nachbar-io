// app/(senior)/layout.tsx
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Nachbar.io — Senioren-Geraet',
};

/**
 * Layout fuer das stationaere Senioren-Geraet (E-Ink-optimiert).
 * Stark vereinfacht: Kein BottomNav, grosse Schrift, hoher Kontrast.
 */
export default function SeniorDeviceLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-white text-anthrazit"
      style={{
        // E-Ink-optimiert: Kein Gradient, kein Schatten, hoher Kontrast
        fontSize: '20px',
        lineHeight: '1.6',
      }}
    >
      <main className="mx-auto max-w-md px-6 py-8">
        {children}
      </main>
    </div>
  );
}
