// app/b2b/layout.tsx
// Nachbar.io — B2B-Landingpage Layout (oeffentlich, kein Auth)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QuartierApp fuer Organisationen | nachbar.io',
  description: 'Digitale Quartiersvernetzung fuer Kommunen, Pflegedienste und Wohnungsbaugesellschaften. Heartbeat-Monitoring, Einsamkeits-Praevention, anonymisierte Statistiken.',
};

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
