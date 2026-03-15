// app/(app)/care/consultations/page.tsx
'use client';

import { useState } from 'react';
import { useConsultations } from '@/lib/care/hooks/useConsultations';
import { ConsultationSlotCard } from '@/components/care/ConsultationSlotCard';
import { ConsultationConsent } from '@/components/care/ConsultationConsent';
import { TechCheck } from '@/components/care/TechCheck';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConsultationsPage() {
  const { slots, loading, bookSlot } = useConsultations(undefined, false);
  const [joining, setJoining] = useState<string | null>(null);
  const [techCheckPassed, setTechCheckPassed] = useState(false);

  const available = slots.filter(s => s.status === 'scheduled' && !s.booked_by);
  const mySlots = slots.filter(s => s.booked_by || s.status === 'waiting' || s.status === 'active');

  async function handleBook(slotId: string) {
    try {
      await bookSlot(slotId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Buchung fehlgeschlagen');
    }
  }

  function handleJoin(slotId: string) {
    const slot = slots.find(s => s.id === slotId);
    if (slot?.join_url) {
      window.open(slot.join_url, '_blank');
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/care" className="p-2 rounded-xl hover:bg-anthrazit/5">
          <ArrowLeft className="h-6 w-6 text-anthrazit" />
        </Link>
        <h1 className="text-2xl font-bold text-anthrazit">Sprechstunden</h1>
      </div>

      {loading && <p className="text-anthrazit/50">Laden...</p>}

      {/* Meine Termine */}
      {mySlots.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-anthrazit mb-3">Meine Termine</h2>
          <div className="space-y-3">
            {mySlots.map(slot => (
              <ConsultationSlotCard key={slot.id} slot={slot} onJoin={handleJoin} />
            ))}
          </div>
        </section>
      )}

      {/* Verfuegbare Sprechstunden */}
      {available.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-anthrazit mb-3">Verfuegbare Termine</h2>
          <div className="space-y-3">
            {available.map(slot => (
              <ConsultationSlotCard key={slot.id} slot={slot} onBook={handleBook} />
            ))}
          </div>
        </section>
      )}

      {/* Kein Termin */}
      {!loading && available.length === 0 && mySlots.length === 0 && (
        <div className="rounded-2xl bg-anthrazit/5 p-8 text-center">
          <p className="text-xl text-anthrazit/60">Keine Sprechstunden geplant</p>
          <p className="text-anthrazit/40 mt-2">
            Ihr Quartierslotse oder Arzt wird Termine einrichten
          </p>
        </div>
      )}
    </div>
  );
}
