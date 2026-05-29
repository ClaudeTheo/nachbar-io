// app/(app)/quartier/page.tsx
// "Mein Quartier"-Hub (App-Struktur Welle 3, Option C).
//
// /quartier ist wieder der kanonische Bottom-Tab "Mein Quartier" und rendert
// den schlanken Navigations-Hub (QuartierHub). Der fruehere B-5-Redirect auf
// /quartier-info samt Feature-Flag `legacy_quartier_hub` ist entfernt:
//   - /quartier-info bleibt das Info-Modul (Wetter/NINA/ÖPNV/Apotheken) und ist
//     im Hub nur EINE Kachel.
//   - /hier-bei-mir und Voice-/Warnungs-Kontexte zeigen weiter direkt auf
//     /quartier-info (B-5 bleibt dort gueltig).
//
// Rollback fuer diese Aufbauphase laeuft ueber Git/PR, nicht ueber ein
// Runtime-Flag.

import { QuartierHub } from "./QuartierHub";

export default function QuartierPage() {
  return <QuartierHub />;
}
