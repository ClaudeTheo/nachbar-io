// app/(app)/hier-bei-mir/page.tsx
// Phase-1 Task G-1: Senior-freundliche Route `/hier-bei-mir`.
//
// Nach Task B-5 ist `/quartier-info` der kanonische Ort fuer
// Wetter/Pollen/NINA/Muell/OePNV/Apotheken/Events/Rathaus. Die
// kreis-start-Kachel "HIER BEI MIR" zeigt bereits auf
// /hier-bei-mir (siehe kreis-start/page.tsx). Diese Route ist eine
// duenne Senior-Alias-Route: Sie rendert dieselbe Komponente wie
// /quartier-info, aber unter einem URL-Slug in der Senior-Sprache.
//
// G-2/G-3 (Wetter+NINA, Muell) sind implizit erfuellt, weil die
// bestehende QuartierInfoPage diese Sektionen bereits enthaelt.
// G-4 (Karten-Thumbnail) und G-5 (Vorlesen-Tagesueberblick) sind
// noch TODO und werden spaeter direkt in der gemeinsamen Komponente
// ergaenzt, nicht in diesem Alias.

import QuartierInfoPage from "../quartier-info/page";

export default function HierBeiMirPage() {
  return <QuartierInfoPage />;
}
