"use client";

import { NachbarKarte } from "@/components/NachbarKarte";
import { PageHeader } from "@/components/ui/page-header";

export default function MapPage() {
  return (
    <div className="space-y-4 pb-24 lg:relative lg:left-1/2 lg:w-[min(calc(100vw-4rem),1100px)] lg:-translate-x-1/2 lg:space-y-6">
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
