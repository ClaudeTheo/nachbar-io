// app/(app)/jugend/aufgaben/page.tsx
// Jugend-Modul: Aufgaben-Board Seite
'use client';

import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { TaskBoard, useYouthProfile } from '@/modules/youth';

export default function JugendAufgaben() {
  const { profile } = useYouthProfile();

  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-5 text-white">
      <Link
        href="/jugend"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 px-3 py-2 text-sm font-bold text-cyan-50/78"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück
      </Link>

      <header className="mt-5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-300/14 text-lime-100 ring-1 ring-lime-100/25">
          <ClipboardList className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight">
          Aufgaben im Quartier
        </h1>
        <p className="mt-2 text-sm leading-6 text-cyan-50/70">
          Kleine Einsätze, Lernen, Technik, Garten oder Treffpunkte.
        </p>
      </header>

      <div className="mt-6">
        <TaskBoard quarterId={profile?.quarter_id || undefined} />
      </div>
    </div>
  );
}
