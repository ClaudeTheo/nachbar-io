// app/(app)/jugend/aufgaben/page.tsx
// Jugend-Modul: Aufgaben-Board Seite
'use client';

import { TaskBoard } from '@/components/youth/TaskBoard';
import { useYouthProfile } from '@/lib/youth/hooks';

export default function JugendAufgaben() {
  const { profile } = useYouthProfile();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-anthrazit">Aufgaben</h1>
      <p className="text-gray-500">Hilf im Quartier und sammle Punkte!</p>

      <TaskBoard quarterId={profile?.quarter_id || undefined} />
    </div>
  );
}
