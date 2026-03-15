'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, List, Plus, X } from 'lucide-react';
import { AppointmentList } from '@/components/care/AppointmentList';
import { AppointmentCalendar } from '@/components/care/AppointmentCalendar';
import { AppointmentForm } from '@/components/care/AppointmentForm';
import { useAppointments } from '@/lib/care/hooks/useAppointments';

type ViewMode = 'calendar' | 'list';

export default function AppointmentsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Alle Termine laden (nicht nur anstehende) fuer Kalenderansicht
  const { appointments, refetch } = useAppointments(userId ?? undefined, false);

  function handleSuccess() {
    setShowForm(false);
    setListKey((k) => k + 1);
    refetch();
  }

  if (!userId) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-anthrazit flex items-center gap-2">
            <Calendar className="h-6 w-6 text-quartier-green" />
            Termine
          </h1>
          <p className="text-muted-foreground mt-1">Arzttermine und Pflegetermine verwalten</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="min-h-[80px] min-w-[80px] flex flex-col items-center justify-center gap-1 rounded-xl border bg-card px-3 py-2 text-sm font-medium text-anthrazit hover:bg-muted transition-colors"
          aria-label={showForm ? 'Formular schliessen' : 'Neuen Termin erstellen'}
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? 'Schliessen' : 'Neuer Termin'}
        </button>
      </div>

      {/* Ansicht-Umschalter: Kalender / Liste */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-1.5 min-h-[44px] px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-white text-anthrazit shadow-sm'
              : 'text-muted-foreground hover:text-anthrazit'
          }`}
          aria-label="Kalenderansicht"
        >
          <Calendar className="h-4 w-4" />
          Kalender
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 min-h-[44px] px-4 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-anthrazit shadow-sm'
              : 'text-muted-foreground hover:text-anthrazit'
          }`}
          aria-label="Listenansicht"
        >
          <List className="h-4 w-4" />
          Liste
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-4">
          <AppointmentForm
            seniorId={userId}
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {viewMode === 'calendar' ? (
        <AppointmentCalendar appointments={appointments} />
      ) : (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Anstehende Termine</h2>
          <AppointmentList key={listKey} seniorId={userId} />
        </div>
      )}
    </div>
  );
}
