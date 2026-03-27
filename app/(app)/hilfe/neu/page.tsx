'use client';

import { useRouter } from 'next/navigation';
import { NewRequestForm } from '@/components/hilfe/NewRequestForm';

/** Seite zum Erstellen eines neuen Hilfe-Gesuchs */
export default function NeuesGesuchPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-[#2D3142]">Neues Hilfe-Gesuch</h1>
      <NewRequestForm onSuccess={() => router.push('/hilfe')} />
    </div>
  );
}
