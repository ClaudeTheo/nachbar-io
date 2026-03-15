'use client';

// Zeigt einen einzelnen Termin mit Typ-Icon, Datum, Uhrzeit und Aktions-Buttons

import { Activity, Calendar, Heart, MapPin, Pencil, Stethoscope, Trash2 } from 'lucide-react';
import type { CareAppointment, CareAppointmentType } from '@/lib/care/types';

interface AppointmentCardProps {
  appointment: CareAppointment;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Typ-Konfiguration: Icon, Label, Farbe
const TYPE_CONFIG: Partial<Record<
  CareAppointmentType,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
>> = {
  doctor:       { label: 'Arzttermin',       Icon: Stethoscope },
  care_service: { label: 'Pflegedienst',      Icon: Heart },
  therapy:      { label: 'Therapie',          Icon: Activity },
  shopping:     { label: 'Einkauf',           Icon: MapPin },
  other:        { label: 'Sonstiger Termin',  Icon: Calendar },
};

// Datum im deutschen Format: "Mo., 10. Mär."
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Uhrzeit im deutschen Format: "14:30"
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AppointmentCard({ appointment, onEdit, onDelete }: AppointmentCardProps) {
  const config = TYPE_CONFIG[appointment.type] ?? TYPE_CONFIG.other;
  const { Icon } = config;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      {/* Kopfzeile: Icon, Titel, Typ-Label */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Typ-Icon */}
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <Icon className="h-5 w-5 text-anthrazit" />
          </div>

          {/* Inhalt */}
          <div className="space-y-0.5">
            <p className="font-bold text-anthrazit leading-tight">{appointment.title}</p>
            <p className="text-sm text-muted-foreground">{config.label}</p>

            {/* Datum und Uhrzeit */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-sm font-medium text-anthrazit">
                {formatDate(appointment.scheduled_at)}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatTime(appointment.scheduled_at)} Uhr
              </span>
              <span className="text-xs text-muted-foreground">
                · {appointment.duration_minutes} Min.
              </span>
            </div>
          </div>
        </div>

        {/* Aktions-Buttons (Edit / Delete) */}
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label="Termin bearbeiten"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-muted-foreground hover:bg-gray-50 active:bg-gray-100"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                aria-label="Termin loeschen"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 active:bg-red-100"
                style={{ minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ort (wenn vorhanden) */}
      {appointment.location && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{appointment.location}</span>
        </div>
      )}

      {/* Notizen (wenn vorhanden) */}
      {appointment.notes && (
        <p className="text-sm text-muted-foreground border-t pt-2">{appointment.notes}</p>
      )}
    </div>
  );
}
