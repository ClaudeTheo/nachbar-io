'use client';

// Alle-Medikamente-Liste: Zeigt alle aktiven Medikamente mit Name, Dosierung, Zeitplan

import { Pill, Clock, Calendar, Timer } from 'lucide-react';
import { useMedications } from '@/lib/care/hooks/useMedications';
import type { MedicationSchedule } from '@/lib/care/types';

interface MedicationManagementListProps {
  seniorId: string;
}

// Zeitplan als lesbaren Text formatieren
function formatSchedule(schedule: MedicationSchedule): string {
  switch (schedule.type) {
    case 'daily':
      return `Täglich um ${schedule.times?.join(', ') ?? '—'}`;
    case 'weekly':
      return `${schedule.days?.join(', ') ?? '—'} um ${schedule.time ?? '—'}`;
    case 'interval':
      return `Alle ${schedule.every_hours ?? '?'} Stunden`;
    default:
      return 'Kein Zeitplan';
  }
}

// Zeitplan-Icon
function ScheduleIcon({ type }: { type: MedicationSchedule['type'] }) {
  switch (type) {
    case 'daily': return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'weekly': return <Calendar className="h-4 w-4 text-muted-foreground" />;
    case 'interval': return <Timer className="h-4 w-4 text-muted-foreground" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function MedicationManagementList({ seniorId }: MedicationManagementListProps) {
  const { medications, loading } = useMedications(seniorId);

  if (loading) {
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

  if (medications.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-2xl mb-2">💊</p>
        <p className="text-muted-foreground">Keine Medikamente hinterlegt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => (
        <div key={med.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Pill className="h-5 w-5 text-anthrazit" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-anthrazit leading-tight">{med.name}</p>
              {med.dosage && (
                <p className="text-sm text-muted-foreground">{med.dosage}</p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <ScheduleIcon type={med.schedule.type} />
                <p className="text-xs text-muted-foreground">{formatSchedule(med.schedule)}</p>
              </div>
              {med.instructions && (
                <p className="mt-1 text-xs text-muted-foreground italic truncate">
                  {med.instructions}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
