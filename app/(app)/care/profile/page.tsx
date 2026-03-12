'use client';

// Pflege-Profil Seite: Pflegestufe, Notfallkontakte, Check-in-Zeiten, Eskalation konfigurieren

import { useEffect, useState } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CareProfileForm } from '@/components/care/CareProfileForm';

export default function CareProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  if (!userId) {
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
      <CareProfileForm userId={userId} />
    </div>
  );
}
