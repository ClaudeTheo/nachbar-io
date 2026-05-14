// app/(app)/jugend/aufgaben/page.tsx
// Jugend-Modul: Missionen-Seite
"use client";

import {
  TaskBoard,
  useYouthProfile,
  YouthMissionsSurface,
} from "@/modules/youth";

export default function JugendAufgaben() {
  const { profile } = useYouthProfile();

  return (
    <YouthMissionsSurface
      profile={profile}
      taskSlot={<TaskBoard quarterId={profile?.quarter_id || undefined} />}
    />
  );
}
