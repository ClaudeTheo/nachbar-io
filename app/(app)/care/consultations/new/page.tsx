// app/(app)/care/consultations/new/page.tsx
'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ConsultationSlotForm } from '@/components/care/ConsultationSlotForm';

export default function NewConsultationPage() {
  // TODO: quarterId aus User-Kontext laden (hardcoded fuer Pilot)
  const quarterId = 'pilot-bad-saeckingen';

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Neuer Termin"
        backHref="/care/consultations"
      />

      <ConsultationSlotForm quarterId={quarterId} />
    </div>
  );
}
