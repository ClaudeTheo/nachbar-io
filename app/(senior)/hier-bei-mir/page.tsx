// app/(senior)/hier-bei-mir/page.tsx
// Welle S1, Schritt 4 (Befund A4:4): "Hier bei mir" in der Senior-Shell.
//
// Frueher fiel der Senior beim Tap auf seine zentrale Kachel aus der
// Senior-Welt (20px-Font, 112-Leiste) in die dichte Standard-Seite
// (/quartier-info, text-xs). Diese Route liegt in der (senior)-Route-Gruppe
// und erbt damit das Senioren-Layout.
//
// Container: holt die Daten (useQuartierInfo -> /api/quartier-info, derselbe
// Hook wie die Standard-Seite, kein Duplikat) und reicht sie an die
// Praesentations-Komponente SeniorHierBeiMirView durch.
"use client";

import { SeniorHierBeiMirView } from "@/modules/info-hub/SeniorHierBeiMirView";
import { useQuartierInfo } from "@/modules/info-hub/useQuartierInfo";

export default function SeniorHierBeiMirPage() {
  const { currentQuarter, data, apiError, loading, refresh } = useQuartierInfo();

  return (
    <SeniorHierBeiMirView
      currentQuarter={currentQuarter}
      data={data}
      apiError={apiError}
      loading={loading}
      onRefresh={refresh}
    />
  );
}
