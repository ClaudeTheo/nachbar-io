"use client";

import { NachbarKarte } from "@/components/NachbarKarte";
import { PageHeader } from "@/components/ui/page-header";

export default function MapPage() {
  return (
    <div>
      <PageHeader
        title="Quartierskarte"
        subtitle="Ihr Quartier auf der Karte"
        backHref="/dashboard"
        className="mb-4"
      />
      <NachbarKarte />
    </div>
  );
}
