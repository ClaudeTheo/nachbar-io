'use client';

// Wecker-Hook: Prueft ob ein Check-in faellig ist und loest den Alarm aus.
// Der Alarm klingelt zur konfigurierten Check-in-Zeit.
// Beim Abschalten ("Aus") wird automatisch ein Check-in abgesetzt.

import { useCallback, useEffect, useRef, useState } from 'react';

interface AlarmState {
  isRinging: boolean;       // Wecker klingelt gerade
  scheduledAt: string | null; // Geplanter Zeitpunkt des aktuellen Alarms
  nextAlarmIn: number | null; // Sekunden bis zum naechsten Alarm (null wenn deaktiviert)
}

interface UseAlarmReturn {
  alarm: AlarmState;
  dismissAlarm: () => Promise<boolean>; // Alarm abschalten + Check-in senden
  snoozeAlarm: (minutes?: number) => void; // Schlummern
}

// Schwelle in Minuten: Alarm wird ausgeloest, wenn die Check-in-Zeit
// hoechstens ALARM_THRESHOLD_MINUTES Minuten in der Vergangenheit liegt
const ALARM_THRESHOLD_MINUTES = 5;

// Schlummer-Dauer in Minuten (Standard)
const DEFAULT_SNOOZE_MINUTES = 10;

export function useAlarm(): UseAlarmReturn {
  const [alarm, setAlarm] = useState<AlarmState>({
    isRinging: false,
    scheduledAt: null,
    nextAlarmIn: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snoozedUntilRef = useRef<Date | null>(null);
  const dismissedTimesRef = useRef<Set<string>>(new Set());
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web Audio API: Sanfter Weckton erzeugen (kein MP3 noetig)
  const startSound = useCallback(() => {
    try {
      if (audioContextRef.current?.state === 'running') return;

      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Wiederholenden Ton erzeugen: Ding-Dong Muster
      function playTone() {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioContextRef.current.currentTime); // A5
        osc.frequency.setValueAtTime(660, audioContextRef.current.currentTime + 0.3); // E5

        gain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.8);

        osc.start(audioContextRef.current.currentTime);
        osc.stop(audioContextRef.current.currentTime + 0.8);
      }

      playTone();
      alarmIntervalRef.current = setInterval(playTone, 2000); // Alle 2 Sekunden
    } catch {
      console.log('[alarm] Web Audio API nicht verfuegbar');
    }
  }, []);

  const stopSound = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => stopSound();
  }, [stopSound]);

  // Check-in-Zeiten vom Server laden und Alarm-Logik starten
  useEffect(() => {
    async function checkAlarm() {
      try {
        const res = await fetch('/api/care/checkin/status');
        if (!res.ok) return;

        const data = await res.json();

        if (!data.checkinEnabled) {
          setAlarm({ isRinging: false, scheduledAt: null, nextAlarmIn: null });
          return;
        }

        const now = new Date();
        const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Bereits abgeschlossene Check-in-Zeiten (completed_at gesetzt)
        const completedTimes = new Set(
          (data.today ?? [])
            .filter((c: { completed_at: string | null; status: string }) => c.completed_at !== null && c.status !== 'missed')
            .map((c: { scheduled_at: string }) => {
              const d = new Date(c.scheduled_at);
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            })
        );

        // Pruefen ob eine Check-in-Zeit gerade faellig ist und noch nicht erledigt
        const checkinTimes: string[] = data.checkinTimes ?? [];
        let shouldRing = false;
        let ringScheduledAt: string | null = null;

        for (const time of checkinTimes) {
          if (completedTimes.has(time)) continue;
          if (dismissedTimesRef.current.has(time)) continue;

          // Schlummer-Prüfung
          if (snoozedUntilRef.current && now < snoozedUntilRef.current) continue;

          // Ist die Zeit faellig? (innerhalb ALARM_THRESHOLD_MINUTES)
          const [h, m] = time.split(':').map(Number);
          const scheduledDate = new Date();
          scheduledDate.setHours(h, m, 0, 0);

          const diffMinutes = (now.getTime() - scheduledDate.getTime()) / 60000;

          if (diffMinutes >= 0 && diffMinutes <= ALARM_THRESHOLD_MINUTES) {
            shouldRing = true;
            ringScheduledAt = scheduledDate.toISOString();
            break;
          }
        }

        // Naechsten Alarm berechnen
        let nextAlarmIn: number | null = null;
        const futureTimes = checkinTimes
          .filter((t: string) => !completedTimes.has(t) && t > nowHHMM)
          .sort();

        if (futureTimes.length > 0) {
          const [h, m] = futureTimes[0].split(':').map(Number);
          const nextDate = new Date();
          nextDate.setHours(h, m, 0, 0);
          nextAlarmIn = Math.max(0, Math.floor((nextDate.getTime() - now.getTime()) / 1000));
        }

        if (shouldRing && !alarm.isRinging) {
          // Alarm starten
          setAlarm({ isRinging: true, scheduledAt: ringScheduledAt, nextAlarmIn });
          startSound();
        } else if (!shouldRing && alarm.isRinging) {
          // Alarm beenden (Check-in wurde extern erledigt)
          setAlarm({ isRinging: false, scheduledAt: null, nextAlarmIn });
          stopSound();
        } else {
          setAlarm((prev) => ({ ...prev, nextAlarmIn }));
        }
      } catch {
        // Fehler still ignorieren
      }
    }

    // Sofort pruefen und dann alle 30 Sekunden
    checkAlarm();
    timerRef.current = setInterval(checkAlarm, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarm.isRinging]);

  // Alarm abschalten + Check-in senden
  const dismissAlarm = useCallback(async (): Promise<boolean> => {
    // Sound stoppen
    stopSound();

    // Aktuelle Alarm-Zeit merken (nicht nochmal klingeln)
    const scheduledAt = alarm.scheduledAt;
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      dismissedTimesRef.current.add(timeStr);
    }

    setAlarm({ isRinging: false, scheduledAt: null, nextAlarmIn: alarm.nextAlarmIn });

    // Check-in automatisch mit "ok" absetzen
    try {
      const res = await fetch('/api/care/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ok',
          mood: 'good',
          note: 'Wecker bestaetigt',
          scheduled_at: scheduledAt ?? undefined,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [alarm.scheduledAt, alarm.nextAlarmIn, stopSound]);

  // Schlummern
  const snoozeAlarm = useCallback((minutes = DEFAULT_SNOOZE_MINUTES) => {
    stopSound();

    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
    snoozedUntilRef.current = snoozeUntil;

    setAlarm((prev) => ({ ...prev, isRinging: false }));
  }, [stopSound]);

  return { alarm, dismissAlarm, snoozeAlarm };
}
