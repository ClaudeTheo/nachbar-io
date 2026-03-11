'use client';

import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { CareCheckin } from '@/lib/care/types';

interface CheckinHistoryProps {
  checkins: CareCheckin[];
  loading?: boolean;
}

const STATUS_META: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  ok: { icon: CheckCircle, color: 'text-quartier-green', label: 'Gut' },
  not_well: { icon: AlertTriangle, color: 'text-alert-amber', label: 'Nicht so gut' },
  need_help: { icon: XCircle, color: 'text-emergency-red', label: 'Hilfe noetig' },
  missed: { icon: XCircle, color: 'text-emergency-red', label: 'Verpasst' },
  reminded: { icon: Clock, color: 'text-muted-foreground', label: 'Ausstehend' },
};

export function CheckinHistory({ checkins, loading }: CheckinHistoryProps) {
  if (loading) {
    return <div className="animate-pulse space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}</div>;
  }
  if (checkins.length === 0) {
    return <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">Noch keine Check-ins vorhanden.</div>;
  }
  return (
    <div className="space-y-2">
      {checkins.map((checkin) => {
        const meta = STATUS_META[checkin.status] ?? STATUS_META.reminded;
        const Icon = meta.icon;
        const time = new Date(checkin.scheduled_at);
        return (
          <div key={checkin.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
            <Icon className={`h-5 w-5 ${meta.color}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`font-medium text-sm ${meta.color}`}>
                  {meta.label}
                  {checkin.mood && ` — ${checkin.mood === 'good' ? '😊' : checkin.mood === 'neutral' ? '😐' : '😟'}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {time.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {checkin.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{checkin.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
