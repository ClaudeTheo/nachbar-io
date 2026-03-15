// components/care/ConsultationSlotCard.tsx
'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Clock, User, Video } from 'lucide-react';
import type { ConsultationSlot } from '@/lib/care/types';

interface ConsultationSlotCardProps {
  slot: ConsultationSlot;
  /** Callback wenn Nutzer "Termin buchen" klickt */
  onBook?: () => void;
  /** Callback wenn Nutzer "Jetzt teilnehmen" klickt */
  onJoin?: () => void;
}

/**
 * Karte fuer einen Sprechstunden-Termin.
 * Senior-Mode: 80px Touch-Targets, 4.5:1 Kontrast.
 */
export function ConsultationSlotCard({ slot, onBook, onJoin }: ConsultationSlotCardProps) {
  const scheduledDate = new Date(slot.scheduled_at);
  const isBookable = slot.status === 'scheduled' && !slot.booked_by && onBook;
  const isJoinable = (slot.status === 'waiting' || slot.status === 'active') && slot.join_url && onJoin;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Titel */}
      <h3 className="text-lg font-semibold text-anthrazit">
        {slot.title}
      </h3>

      {/* Host */}
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <User className="h-4 w-4 shrink-0" />
        <span>{slot.host_name}</span>
      </div>

      {/* Datum + Uhrzeit */}
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4 shrink-0" />
        <span>{format(scheduledDate, 'EEEE, d. MMMM yyyy', { locale: de })}</span>
      </div>

      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {format(scheduledDate, 'HH:mm', { locale: de })} Uhr
          {' \u00B7 '}
          {slot.duration_minutes} Min.
        </span>
      </div>

      {/* Provider-Type Badge */}
      <div className="mt-3">
        <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {slot.provider_type === 'community' ? 'Quartierslotse' : 'Medizinisch'}
        </span>
      </div>

      {/* Aktions-Buttons (Senior-Mode: min-h 80px) */}
      {isBookable && (
        <button
          onClick={onBook}
          className="mt-4 flex min-h-[80px] w-full items-center justify-center gap-2 rounded-2xl bg-quartier-green text-lg font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80"
        >
          <Calendar className="h-5 w-5" />
          Termin buchen
        </button>
      )}

      {isJoinable && (
        <button
          onClick={onJoin}
          className="mt-4 flex min-h-[80px] w-full animate-pulse items-center justify-center gap-2 rounded-2xl bg-quartier-green text-lg font-semibold text-white transition-colors hover:bg-quartier-green/90 active:bg-quartier-green/80"
        >
          <Video className="h-5 w-5" />
          Jetzt teilnehmen
        </button>
      )}

      {/* Status-Hinweis bei abgeschlossenen/abgesagten Terminen */}
      {slot.status === 'completed' && (
        <p className="mt-3 text-sm text-gray-400">Abgeschlossen</p>
      )}
      {slot.status === 'cancelled' && (
        <p className="mt-3 text-sm text-gray-400">Abgesagt</p>
      )}
    </div>
  );
}
