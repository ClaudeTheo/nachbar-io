// app/(app)/jugend/profil/page.tsx
// Jugend-Modul: Profil-Seite
'use client';

import { useYouthProfile, AccessLevelBanner, PointsDisplay } from '@/modules/youth';
import { PageHeader } from "@/components/ui/page-header";

export default function JugendProfil() {
  const { profile, loading } = useYouthProfile();

  if (loading) {
    return <div className="p-6 animate-pulse"><div className="h-48 bg-gray-200 rounded" /></div>;
  }

  if (!profile) {
    return <div className="p-6 text-center text-gray-500">Kein Jugend-Profil gefunden.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Mein Profil" backHref="/jugend" />

      <AccessLevelBanner level={profile.access_level} showUpgradeHint />

      <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Altersgruppe</span>
          <span className="font-medium">{profile.age_group === 'u16' ? 'Unter 16' : '16-17 Jahre'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Geburtsjahr</span>
          <span className="font-medium">{profile.birth_year}</span>
        </div>
      </div>

      <PointsDisplay points={profile.total_points || 0} />
    </div>
  );
}
