'use client';

// Alarm-Provider: Überwacht Check-in-Zeiten und zeigt Vollbild-Wecker.
// Wird im Care-Layout eingebunden, damit der Alarm auf allen Care-Seiten aktiv ist.

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAlarm } from '@/lib/care/hooks/useAlarm';
import { AlarmScreen } from './AlarmScreen';

interface CareAlarmProviderProps {
  children: ReactNode;
}

const CARE_ALARM_BYPASS_PATHS = new Set([
  '/care/preview',
  '/care/consent/preview',
]);

export function shouldBypassCareAlarmProvider(pathname: string) {
  return CARE_ALARM_BYPASS_PATHS.has(pathname);
}

export function CareAlarmProvider({ children }: CareAlarmProviderProps) {
  const pathname = usePathname();
  const { alarm, dismissAlarm, snoozeAlarm } = useAlarm({
    disabled: shouldBypassCareAlarmProvider(pathname),
  });

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
