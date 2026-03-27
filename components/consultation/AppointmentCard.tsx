// components/consultation/AppointmentCard.tsx
// Karte für einen Termin mit Verhandlungs-Aktionen
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, User, Video, Check, ArrowRightLeft, X } from 'lucide-react';
import { getAvailableActions, type AppointmentStatus, type ActorRole, type AppointmentAction } from '@/lib/consultation/appointment-status';
import type { ConsultationSlot } from '@/lib/care/types';

// Status-Konfiguration für Badges
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  proposed: { label: 'Vorgeschlagen', color: 'bg-amber-100 text-amber-800' },
  counter_proposed: { label: 'Gegenvorschlag', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Bestätigt', color: 'bg-emerald-100 text-emerald-800' },
  active: { label: 'Aktiv', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Abgeschlossen', color: 'bg-gray-100 text-gray-600' },
  declined: { label: 'Abgelehnt', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Abgesagt', color: 'bg-red-100 text-red-800' },
  scheduled: { label: 'Geplant', color: 'bg-blue-100 text-blue-800' },
};

interface AppointmentCardProps {
  slot: ConsultationSlot;
  /** Wer den Termin ansieht */
  actorRole: ActorRole;
  /** Callback für Aktionen (confirm, counter_propose, decline, cancel) */
  onAction: (slotId: string, action: AppointmentAction, scheduledAt?: string) => Promise<void>;
  /** Callback wenn "Gegenvorschlag" geklickt wird (oeffnet Modal) */
  onCounterPropose?: (slotId: string) => void;
}

export function AppointmentCard({ slot, actorRole, onAction, onCounterPropose }: AppointmentCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const scheduledDate = new Date(slot.scheduled_at);
  const statusConfig = STATUS_CONFIG[slot.status] ?? { label: slot.status, color: 'bg-gray-100 text-gray-600' };

  // Wer hat vorgeschlagen?
  const proposedBy: ActorRole = slot.proposed_by === slot.doctor_id ? 'doctor' : 'patient';
  const actions = getAvailableActions(slot.status as AppointmentStatus, actorRole, proposedBy);

  async function handleAction(action: AppointmentAction) {
    if (action === 'counter_propose' && onCounterPropose) {
      onCounterPropose(slot.id);
      return;
    }
    setLoading(action);
    try {
      await onAction(slot.id, action);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header: Arztname/Host + Status-Badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-anthrazit/60 shrink-0" />
          <h3 className="text-lg font-semibold text-anthrazit">
            {slot.host_name || slot.title}
          </h3>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Datum + Uhrzeit */}
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4 shrink-0" />
        <span>{format(scheduledDate, 'EEEE, d. MMMM yyyy', { locale: de })}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {format(scheduledDate, 'HH:mm', { locale: de })} Uhr
          {slot.duration_minutes ? ` · ${slot.duration_minutes} Min.` : ''}
        </span>
      </div>

      {/* Gegenvorschlag-Hinweis: Vorher → Jetzt */}
      {slot.status === 'counter_proposed' && slot.previous_scheduled_at && (
        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            <span className="font-medium">Neuer Terminvorschlag</span>
          </div>
          <p className="mt-1 text-blue-700">
            <span className="line-through">
              {format(new Date(slot.previous_scheduled_at), 'd. MMM yyyy, HH:mm', { locale: de })}
            </span>
            {' → '}
            <span className="font-medium">
              {format(scheduledDate, 'd. MMM yyyy, HH:mm', { locale: de })}
            </span>
          </p>
        </div>
      )}

      {/* Aktions-Buttons (Senior-Mode: min-h 80px für primäre Aktionen) */}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {/* Beitreten — groß und prominent */}
          {actions.includes('join') && slot.join_url && (
            <a
              href={slot.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[80px] w-full items-center justify-center gap-2 rounded-2xl bg-quartier-green text-lg font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80 animate-pulse"
            >
              <Video className="h-5 w-5" />
              Jetzt beitreten
            </a>
          )}

          {/* Bestätigen */}
          {actions.includes('confirm') && (
            <button
              onClick={() => handleAction('confirm')}
              disabled={loading === 'confirm'}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-quartier-green text-base font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80 disabled:opacity-50"
            >
              <Check className="h-5 w-5" />
              {loading === 'confirm' ? 'Wird bestätigt...' : 'Bestätigen'}
            </button>
          )}

          {/* Gegenvorschlag + Ablehnen nebeneinander */}
          <div className="flex gap-2">
            {actions.includes('counter_propose') && (
              <button
                onClick={() => handleAction('counter_propose')}
                className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50 text-base font-medium text-blue-700 transition-colors hover:bg-blue-100"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Gegenvorschlag
              </button>
            )}
            {actions.includes('decline') && (
              <button
                onClick={() => handleAction('decline')}
                disabled={loading === 'decline'}
                className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-gray-50 text-base font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                {loading === 'decline' ? 'Wird abgelehnt...' : 'Ablehnen'}
              </button>
            )}
          </div>

          {/* Absagen */}
          {actions.includes('cancel') && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={loading === 'cancel'}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-red-50 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              {loading === 'cancel' ? 'Wird abgesagt...' : 'Termin absagen'}
            </button>
          )}
        </div>
      )}

      {/* Abgeschlossene/abgesagte Termine */}
      {(slot.status === 'completed' || slot.status === 'declined' || slot.status === 'cancelled') && (
        <p className="mt-3 text-sm text-gray-400">
          {statusConfig.label}
        </p>
      )}
    </div>
  );
}
