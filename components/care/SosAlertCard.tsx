'use client';

import { useState } from 'react';
import { Clock, User } from 'lucide-react';
import { CARE_SOS_CATEGORIES, ESCALATION_LEVELS } from '@/lib/care/constants';
import type { CareSosAlert } from '@/lib/care/types';

interface SosAlertCardProps {
  alert: CareSosAlert;
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
}

export function SosAlertCard({ alert, onAccept, onDecline, showActions = true }: SosAlertCardProps) {
  const [responding, setResponding] = useState(false);
  const category = CARE_SOS_CATEGORIES.find((c) => c.id === alert.category);
  const level = ESCALATION_LEVELS.find((l) => l.level === alert.current_escalation_level);
  const createdAgo = Math.round((Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60));

  async function handleRespond(responseType: 'accepted' | 'declined') {
    setResponding(true);
    try {
      await fetch(`/api/care/sos/${alert.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_type: responseType, eta_minutes: responseType === 'accepted' ? 5 : undefined }),
      });
      if (responseType === 'accepted') onAccept?.();
      else onDecline?.();
    } catch { console.error('Antwort fehlgeschlagen'); }
    setResponding(false);
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${category?.isEmergency ? 'border-emergency-red bg-red-50' : 'border-alert-amber bg-amber-50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category?.icon ?? '🆘'}</span>
          <div>
            <h3 className={`font-bold ${category?.isEmergency ? 'text-emergency-red' : 'text-anthrazit'}`}>
              {category?.label ?? 'SOS'}
            </h3>
            {alert.senior?.display_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {alert.senior.display_name}
              </p>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Vor {createdAgo} Min.
          </div>
          <div className="mt-0.5 font-medium">
            Stufe {alert.current_escalation_level}: {level?.label}
          </div>
        </div>
      </div>
      {alert.notes && <p className="text-sm text-muted-foreground mb-3 italic">{alert.notes}</p>}
      {showActions && ['triggered', 'notified', 'escalated'].includes(alert.status) && (
        <div className="flex gap-2">
          <button onClick={() => handleRespond('accepted')} disabled={responding}
            className="flex-1 rounded-lg bg-quartier-green py-3 font-bold text-white active:bg-green-700 disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}>
            ✅ Ich helfe
          </button>
          <button onClick={() => handleRespond('declined')} disabled={responding}
            className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-medium text-muted-foreground active:bg-gray-100 disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}>
            Kann nicht
          </button>
        </div>
      )}
      {alert.status === 'accepted' && (
        <div className="rounded-lg bg-quartier-green/10 p-2 text-sm text-quartier-green font-medium text-center">
          ✅ Hilfe ist unterwegs
        </div>
      )}
    </div>
  );
}
