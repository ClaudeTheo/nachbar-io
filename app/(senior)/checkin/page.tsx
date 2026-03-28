"use client";

import { SeniorCheckinButtons } from "@/modules/care/components/senior/SeniorCheckinButtons";

export default function SeniorCheckinPage() {
  return (
    <div className="py-4 space-y-6">
      <h1 className="text-3xl font-bold text-center text-anthrazit">
        Wie geht es Ihnen?
      </h1>
      <SeniorCheckinButtons />
    </div>
  );
}
