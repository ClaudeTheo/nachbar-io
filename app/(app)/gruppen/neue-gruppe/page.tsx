"use client";

import { LargeTitle } from "@/components/ui/LargeTitle";
import { CreateGroupForm } from "@/modules/gruppen/components/CreateGroupForm";

export default function NeueGruppePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <LargeTitle title="Neue Gruppe" />
      <CreateGroupForm />
    </div>
  );
}
