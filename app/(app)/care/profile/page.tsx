'use client';

// Pflege-Profil Seite: Pflegestufe, Notfallkontakte, Check-in-Zeiten, Eskalation konfigurieren

import { ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import { CareProfileForm } from '@/components/care/CareProfileForm';
import { useAuth } from '@/hooks/use-auth';

export default function CareProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Zurueck-Link */}
      <Link
        href="/care"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Heart className="h-6 w-6 text-quartier-green" />
          Pflege-Profil
        </h1>
        <p className="text-muted-foreground mt-1">
          Ihre persoenlichen Pflege-Einstellungen und Notfallkontakte
        </p>
      </div>

      {/* Formular */}
      <CareProfileForm userId={user.id} />
    </div>
  );
}
