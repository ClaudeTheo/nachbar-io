'use client';

// Nachbar Hilfe — Pflege-Profil Seite
// Pflegegrad, Pflegekasse und Versichertennummer verwalten

import { Heart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { CareProfileForm } from '@/components/hilfe/CareProfileForm';

export default function HilfeCareProfilePage() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Seitenkopf */}
      <PageHeader
        title={<><Heart className="h-6 w-6 text-[#4CAF87]" /> Mein Pflege-Profil</>}
        subtitle="Verwalten Sie hier Ihren Pflegegrad und Ihre Kassendaten. Diese Informationen werden fuer die Abrechnung Ihrer Entlastungsleistungen benoetigt."
        backHref="/hilfe"
      />

      {/* Formular */}
      <CareProfileForm />
    </div>
  );
}
