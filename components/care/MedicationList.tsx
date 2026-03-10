'use client';

// Liste faelliger Medikamente, gruppiert nach Tageszeit

import { useDueMedications } from '@/lib/care/hooks/useDueMedications';
import { MedicationCard } from './MedicationCard';
import type { CareMedicationLogStatus } from '@/lib/care/types';

interface MedicationListProps {
  seniorId: string;
}

// Ladezustand: Platzhalter-Skelett
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Stunde aus ISO-String lesen
function getHour(iso: string): number {
  return new Date(iso).getHours();
}

export function MedicationList({ seniorId }: MedicationListProps) {
  const { dueMeds, loading, refetch } = useDueMedications(seniorId);

  // Medikamenten-Einnahme protokollieren und Liste neu laden
  async function handleAction(medicationId: string, scheduledAt: string, status: CareMedicationLogStatus) {
    try {
      await fetch('/api/care/medications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medication_id: medicationId, status, scheduled_at: scheduledAt }),
      });
    } catch {
      // Fehler still ignorieren — refetch zeigt aktuellen Stand
    }
    await refetch();
  }

  if (loading) return <LoadingSkeleton />;

  if (dueMeds.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-2xl mb-2">💊</p>
        <p className="text-muted-foreground">Keine Medikamente faellig.</p>
      </div>
    );
  }

  // Aufteilung: Morgens (< 12:00) und Abends (>= 12:00)
  const morgens = dueMeds.filter((m) => getHour(m.scheduled_at) < 12);
  const abends  = dueMeds.filter((m) => getHour(m.scheduled_at) >= 12);

  const renderGroup = (title: string, items: typeof dueMeds) => {
    if (items.length === 0) return null;
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <MedicationCard
              key={`${item.medication.id}-${item.scheduled_at}`}
              medication={item.medication}
              scheduledAt={item.scheduled_at}
              status={item.status}
              snoozedUntil={item.snoozed_until}
              onAction={(newStatus) => handleAction(item.medication.id, item.scheduled_at, newStatus)}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup('Morgens', morgens)}
      {renderGroup('Abends', abends)}
    </div>
  );
}
