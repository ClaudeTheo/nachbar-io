"use client";

import { NachbarKarte } from "@/components/NachbarKarte";

export default function MapPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-anthrazit">Quartierskarte</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ihr Quartier auf der Karte</p>
      </div>
      <NachbarKarte />
    </div>
  );
}
