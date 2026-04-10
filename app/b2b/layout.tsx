// app/b2b/layout.tsx
// Nachbar.io — B2B-Landingpage Layout (oeffentlich, kein Auth)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QuartierApp für Organisationen | nachbar.io',
  description: 'Digitale Quartiersvernetzung für Kommunen, Pflegedienste und Wohnungsbaugesellschaften. Lebenszeichen-Übersicht, nachbarschaftliche Vernetzung und anonymisierte Quartiers-Statistiken.',
};

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
