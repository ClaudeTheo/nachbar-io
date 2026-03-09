"use client";

import { NachbarKarte } from "@/components/NachbarKarte";

export default function MapPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-anthrazit">Quartierskarte</h1>
      <NachbarKarte />
    </div>
  );
}
