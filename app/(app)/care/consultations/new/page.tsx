// app/(app)/care/consultations/new/page.tsx
'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConsultationSlotForm } from '@/components/care/ConsultationSlotForm';

export default function NewConsultationPage() {
  // TODO: quarterId aus User-Kontext laden (hardcoded fuer Pilot)
  const quarterId = 'pilot-bad-saeckingen';

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/care/consultations" className="p-2 rounded-xl hover:bg-anthrazit/5">
          <ArrowLeft className="h-6 w-6 text-anthrazit" />
        </Link>
        <h1 className="text-2xl font-bold text-anthrazit">Neuer Termin</h1>
      </div>

      <ConsultationSlotForm quarterId={quarterId} />
    </div>
  );
}
