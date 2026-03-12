'use client';

// Alarm-Provider: Ueberwacht Check-in-Zeiten und zeigt Vollbild-Wecker.
// Wird im Care-Layout eingebunden, damit der Alarm auf allen Care-Seiten aktiv ist.

import type { ReactNode } from 'react';
import { useAlarm } from '@/lib/care/hooks/useAlarm';
import { AlarmScreen } from './AlarmScreen';

interface CareAlarmProviderProps {
  children: ReactNode;
}

export function CareAlarmProvider({ children }: CareAlarmProviderProps) {
  const { alarm, dismissAlarm, snoozeAlarm } = useAlarm();

  return (
    <>
      {alarm.isRinging && (
        <AlarmScreen
          onDismiss={dismissAlarm}
          onSnooze={snoozeAlarm}
        />
      )}
      {children}
    </>
  );
}
