// app/(app)/mein-kreis/page.tsx
// Phase 1 Design-Doc 4.1: Stabile Route fuer den Vertrauenskreis.
// Rendert die bestehende meine-senioren Komponente (kein Redirect — URL bleibt stabil).
// Legacy-Pfad /care/meine-senioren bleibt erreichbar, bis Task I Legacy-Routen gatet.

import MeinKreisPage from "@/app/(app)/care/meine-senioren/page";

export default function MeinKreisRoute() {
  return <MeinKreisPage />;
}
