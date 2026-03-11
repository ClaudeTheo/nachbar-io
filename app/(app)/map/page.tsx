"use client";

import dynamic from "next/dynamic";

// Leaflet benoetigt Browser-APIs — kein SSR
const QuarterMapLeaflet = dynamic(
  () => import("@/components/QuarterMapLeaflet").then((m) => m.QuarterMapLeaflet),
  { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> },
);

export default function MapPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-anthrazit">Quartierskarte</h1>
      <QuarterMapLeaflet />
    </div>
  );
}
