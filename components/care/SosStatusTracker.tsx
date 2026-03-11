'use client';

import { useEffect, useState } from 'react';
import { ESCALATION_LEVELS } from '@/lib/care/constants';
import { minutesUntilEscalation } from '@/lib/care/escalation';
import type { CareSosAlert, EscalationConfig } from '@/lib/care/types';

interface SosStatusTrackerProps {
  alert: CareSosAlert;
  escalationConfig?: EscalationConfig;
}

export function SosStatusTracker({ alert, escalationConfig }: SosStatusTrackerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const remaining = minutesUntilEscalation(
        alert.current_escalation_level,
        alert.created_at,
        alert.escalated_at ?? [],
        escalationConfig
      );
      setTimeLeft(remaining);
    }
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [alert, escalationConfig]);

  const isResolved = ['resolved', 'cancelled'].includes(alert.status);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Eskalations-Fortschritt</h4>
      <div className="flex gap-1">
        {ESCALATION_LEVELS.map((level) => {
          const isActive = alert.current_escalation_level === level.level;
          const isPast = alert.current_escalation_level > level.level;
          return (
            <div key={level.level}
              className={`flex-1 rounded-lg p-2 text-center text-xs transition-colors ${
                isResolved ? 'bg-gray-100 text-muted-foreground'
                : isPast ? 'bg-alert-amber/20 text-alert-amber font-medium'
                : isActive ? 'bg-emergency-red/10 text-emergency-red font-bold ring-2 ring-emergency-red/30'
                : 'bg-gray-100 text-muted-foreground'
              }`}>
              <div className="font-medium">{level.label}</div>
              {isActive && !isResolved && timeLeft !== null && (
                <div className="mt-0.5 text-[10px]">
                  {timeLeft > 0 ? `${Math.ceil(timeLeft)} Min.` : 'Eskaliert...'}
                </div>
              )}
              {isPast && <div className="mt-0.5 text-[10px]">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
