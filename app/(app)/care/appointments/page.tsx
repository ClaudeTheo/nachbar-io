'use client';

import { useState } from 'react';
import { Calendar, List, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { AppointmentList } from '@/components/care/AppointmentList';
import { AppointmentCalendar } from '@/components/care/AppointmentCalendar';
import { AppointmentForm } from '@/components/care/AppointmentForm';
import { useAppointments } from '@/lib/care/hooks/useAppointments';
import { useAuth } from '@/hooks/use-auth';

type ViewMode = 'calendar' | 'list';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Alle Termine laden (nicht nur anstehende) fuer Kalenderansicht
  const { appointments, refetch } = useAppointments(user?.id, false);

  function handleSuccess() {
    setShowForm(false);
    setListKey((k) => k + 1);
    refetch();
  }

  if (!user) {
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
      <PageHeader
        title={<><Calendar className="h-6 w-6 text-quartier-green" /> Termine</>}
        subtitle="Arzttermine und Pflegetermine verwalten"
        backHref="/care"
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="min-h-[80px] min-w-[80px] flex flex-col items-center justify-center gap-1 rounded-xl border bg-card px-3 py-2 text-sm font-medium text-anthrazit hover:bg-muted transition-colors"
            aria-label={showForm ? 'Formular schliessen' : 'Neuen Termin erstellen'}
          >
            {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {showForm ? 'Schliessen' : 'Neuer Termin'}
          </button>
        }
      />

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
            seniorId={user.id}
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
          <AppointmentList key={listKey} seniorId={user.id} />
        </div>
      )}
    </div>
  );
}
