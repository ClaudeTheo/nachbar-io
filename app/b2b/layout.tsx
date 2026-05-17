// app/b2b/layout.tsx
// QuartierApp — B2B-Landingpage Layout (oeffentlich, kein Auth)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Für Organisationen',
  description: 'Digitale Quartiersvernetzung für Kommunen, Pflegedienste und Wohnungsbaugesellschaften. Lebenszeichen-Übersicht, nachbarschaftliche Vernetzung und anonymisierte Quartiers-Statistiken.',
};

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
