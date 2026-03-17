'use client';

// Neues Medikament hinzufuegen — Formular-Seite

import { ArrowLeft, Pill } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MedicationForm } from '@/components/care/MedicationForm';

export default function NewMedicationPage() {
  const router = useRouter();

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Zurueck-Link */}
      <Link
        href="/care/medications"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-anthrazit"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurueck
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
          <Pill className="h-6 w-6 text-quartier-green" />
          Erinnerung hinzufügen
        </h1>
        <p className="text-muted-foreground mt-1">
          Erstellen Sie eine neue Erinnerung für Ihren Alltag
        </p>
      </div>

      {/* Formular */}
      <MedicationForm
        onSuccess={() => router.push('/care/medications')}
        onCancel={() => router.back()}
      />
    </div>
  );
}
