'use client';

// Liste anstehender Termine, gruppiert nach Datum

import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { useAppointments } from '@/lib/care/hooks/useAppointments';
import type { CareAppointment } from '@/lib/care/types';
import { AppointmentCard } from './AppointmentCard';

interface AppointmentListProps {
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
              <div className="h-4 w-2/5 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-200" />
              <div className="h-3 w-1/3 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Datum als Gruppierungs-Schlüssel (YYYY-MM-DD in Ortszeit)
function toDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Datums-Schlüssel als lesbares Deutsch: "Montag, 10. März 2026"
function formatDateHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Termine nach Datum gruppieren, Reihenfolge erhalten
function groupByDate(appointments: CareAppointment[]): Map<string, CareAppointment[]> {
  const map = new Map<string, CareAppointment[]>();
  for (const appt of appointments) {
    const key = toDateKey(appt.scheduled_at);
    const existing = map.get(key);
    if (existing) {
      existing.push(appt);
    } else {
      map.set(key, [appt]);
    }
  }
  return map;
}

export function AppointmentList({ seniorId }: AppointmentListProps) {
  const { appointments, loading, refetch } = useAppointments(seniorId);
  // Termin, der gerade gelöscht wird (verhindert doppeltes Auslösen)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Termin per API löschen und Liste neu laden
  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await fetch(`/api/care/appointments/${id}`, { method: 'DELETE' });
    } catch {
      // Fehler still ignorieren — refetch zeigt aktuellen Stand
    }
    setDeletingId(null);
    await refetch();
  }

  if (loading) return <LoadingSkeleton />;

  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Keine anstehenden Termine.</p>
      </div>
    );
  }

  const grouped = groupByDate(appointments);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, items]) => (
        <section key={dateKey}>
          {/* Datums-Überschrift */}
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {formatDateHeading(dateKey)}
          </h2>
          <div className="space-y-3">
            {items.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onDelete={deletingId === appt.id ? undefined : () => handleDelete(appt.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
