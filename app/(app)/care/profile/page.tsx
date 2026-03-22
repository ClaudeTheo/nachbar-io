'use client';

// Pflege-Profil Seite: Pflegestufe, Notfallkontakte, Check-in-Zeiten, Eskalation konfigurieren

import { Heart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
      {/* Header */}
      <PageHeader
        title={<><Heart className="h-6 w-6 text-quartier-green" /> Pflege-Profil</>}
        subtitle="Ihre persoenlichen Pflege-Einstellungen und Notfallkontakte"
        backHref="/care"
      />

      {/* Formular */}
      <CareProfileForm userId={user.id} />
    </div>
  );
}
