// app/(app)/jugend/aufgaben/page.tsx
// Jugend-Modul: Aufgaben-Board Seite
'use client';

import { TaskBoard } from '@/components/youth/TaskBoard';
import { useYouthProfile } from '@/lib/youth/hooks';
import { PageHeader } from "@/components/ui/page-header";

export default function JugendAufgaben() {
  const { profile } = useYouthProfile();

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Aufgaben" subtitle="Hilf im Quartier und sammle Punkte!" backHref="/jugend" />

      <TaskBoard quarterId={profile?.quarter_id || undefined} />
    </div>
  );
}
