// app/(app)/jugend/profil/page.tsx
// Jugend-Modul: Profil-Seite
'use client';

import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { useYouthProfile, AccessLevelBanner, PointsDisplay } from '@/modules/youth';

export default function JugendProfil() {
  const { profile, loading } = useYouthProfile();

  if (loading) {
    return (
      <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-6">
        <div className="h-48 animate-pulse rounded-[24px] bg-white/10" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] bg-[#071923] px-4 py-10 text-center text-cyan-50/70">
        Kein Jugend-Profil gefunden.
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-2 min-h-[calc(100vh-5rem)] space-y-6 bg-[#071923] px-4 py-5 text-white">
      <Link
        href="/jugend"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 px-3 py-2 text-sm font-bold text-cyan-50/78"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück
      </Link>

      <header>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/14 text-cyan-100 ring-1 ring-cyan-100/25">
          <UserRound className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-black leading-tight">
          Mein Profil
        </h1>
      </header>

      <AccessLevelBanner level={profile.access_level} showUpgradeHint variant="youth" />

      <div className="space-y-3 rounded-[22px] border border-white/12 bg-white/[0.07] p-4">
        <div className="flex justify-between">
          <span className="text-cyan-50/62">Altersgruppe</span>
          <span className="font-medium">{profile.age_group === 'u16' ? 'Unter 16' : '16-17 Jahre'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cyan-50/62">Geburtsjahr</span>
          <span className="font-medium">{profile.birth_year}</span>
        </div>
      </div>

      <PointsDisplay points={profile.total_points || 0} variant="youth" />
    </div>
  );
}
