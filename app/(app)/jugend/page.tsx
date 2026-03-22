// app/(app)/jugend/page.tsx
// Jugend-Modul: Dashboard — Uebersicht mit Punkten, Badges, Aufgaben
'use client';

import { useYouthProfile } from '@/lib/youth/hooks';
import { PointsDisplay } from '@/components/youth/PointsDisplay';
import { AccessLevelBanner } from '@/components/youth/AccessLevelBanner';
import Link from 'next/link';
import { PageHeader } from "@/components/ui/page-header";

export default function JugendDashboard() {
  const { profile, loading } = useYouthProfile();

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-24 bg-gray-200 rounded mb-4" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-anthrazit">Willkommen!</h1>
        <p className="text-gray-600 mt-2">
          Melde dich an, um das Jugend-Modul zu nutzen.
        </p>
        <Link
          href="/jugend/registrierung"
          className="mt-4 inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
        >
          Jetzt registrieren
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Jugend-Dashboard" backHref="/dashboard" />

      <AccessLevelBanner level={profile.access_level} showUpgradeHint />

      <PointsDisplay points={profile.total_points || 0} />

      {/* Schnellzugriff-Karten */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/jugend/aufgaben"
          className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-green-400 transition-colors"
        >
          <span className="text-2xl" aria-hidden="true">📋</span>
          <p className="font-semibold mt-2">Aufgaben</p>
          <p className="text-sm text-gray-500">Hilf im Quartier</p>
        </Link>

        <Link
          href="/jugend/badges"
          className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-green-400 transition-colors"
        >
          <span className="text-2xl" aria-hidden="true">🏅</span>
          <p className="font-semibold mt-2">Badges</p>
          <p className="text-sm text-gray-500">Deine Erfolge</p>
        </Link>

        <Link
          href="/jugend/profil"
          className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-green-400 transition-colors"
        >
          <span className="text-2xl" aria-hidden="true">👤</span>
          <p className="font-semibold mt-2">Profil</p>
          <p className="text-sm text-gray-500">Deine Daten</p>
        </Link>

        <Link
          href="/board"
          className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-green-400 transition-colors"
        >
          <span className="text-2xl" aria-hidden="true">📌</span>
          <p className="font-semibold mt-2">Brett</p>
          <p className="text-sm text-gray-500">Schwarzes Brett</p>
        </Link>
      </div>
    </div>
  );
}
