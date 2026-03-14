// lib/care/cron-heartbeat.ts
// Nachbar.io — Cron-Heartbeat: Ueberwacht ob Cron-Jobs regelmaessig laufen (FMEA FM-SOS-03, FM-CI-01, FM-MED-01)

import type { SupabaseClient } from '@supabase/supabase-js';

// Bekannte Cron-Jobs und ihre erwarteten Intervalle (in Minuten)
export const CRON_JOBS = {
  escalation: { name: 'SOS-Eskalation', expectedIntervalMinutes: 2, criticalAfterMinutes: 5 },
  checkin: { name: 'Check-in-Monitoring', expectedIntervalMinutes: 6, criticalAfterMinutes: 15 },
  medications: { name: 'Medikamenten-Erinnerung', expectedIntervalMinutes: 6, criticalAfterMinutes: 15 },
  appointments: { name: 'Termin-Erinnerung', expectedIntervalMinutes: 6, criticalAfterMinutes: 30 },
  onboarding: { name: 'Onboarding-Sequenz', expectedIntervalMinutes: 20, criticalAfterMinutes: 60 },
  dormancy: { name: 'Dormancy-Detection', expectedIntervalMinutes: 1500, criticalAfterMinutes: 2880 },
  digest: { name: 'Woechentlicher Digest', expectedIntervalMinutes: 10500, criticalAfterMinutes: 14400 },
} as const;

export type CronJobId = keyof typeof CRON_JOBS;

// Heartbeat in die Datenbank schreiben (am Ende jedes Cron-Runs)
export async function writeCronHeartbeat(
  supabase: SupabaseClient,
  jobId: CronJobId,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('cron_heartbeats').upsert(
      {
        job_id: jobId,
        last_run_at: new Date().toISOString(),
        metadata: metadata ?? null,
      },
      { onConflict: 'job_id' }
    );
  } catch (error) {
    // Heartbeat-Fehler darf Cron nicht blockieren
    console.error(`[cron-heartbeat] Heartbeat fuer ${jobId} fehlgeschlagen:`, error);
  }
}

// Alle Heartbeats lesen und Status berechnen
export async function checkCronHealth(
  supabase: SupabaseClient
): Promise<Array<{
  jobId: CronJobId;
  name: string;
  status: 'ok' | 'warn' | 'error';
  lastRunAt: string | null;
  minutesAgo: number | null;
  detail: string;
}>> {
  const { data: heartbeats } = await supabase
    .from('cron_heartbeats')
    .select('job_id, last_run_at, metadata');

  const heartbeatMap = new Map(
    (heartbeats ?? []).map((h: { job_id: string; last_run_at: string; metadata: unknown }) => [h.job_id, h])
  );
  const now = Date.now();

  return (Object.entries(CRON_JOBS) as [CronJobId, typeof CRON_JOBS[CronJobId]][]).map(([jobId, config]) => {
    const heartbeat = heartbeatMap.get(jobId);

    if (!heartbeat) {
      return {
        jobId,
        name: config.name,
        status: 'error' as const,
        lastRunAt: null,
        minutesAgo: null,
        detail: 'Noch nie ausgefuehrt',
      };
    }

    const lastRunAt = heartbeat.last_run_at;
    const minutesAgo = Math.round((now - new Date(lastRunAt).getTime()) / 60000);

    let status: 'ok' | 'warn' | 'error';
    let detail: string;

    if (minutesAgo <= config.expectedIntervalMinutes) {
      status = 'ok';
      detail = `Vor ${minutesAgo} Min.`;
    } else if (minutesAgo <= config.criticalAfterMinutes) {
      status = 'warn';
      detail = `Vor ${minutesAgo} Min. (erwartet: alle ${config.expectedIntervalMinutes} Min.)`;
    } else {
      status = 'error';
      detail = `UEBERFAELLIG: Vor ${minutesAgo} Min. (kritisch nach ${config.criticalAfterMinutes} Min.)`;
    }

    return { jobId, name: config.name, status, lastRunAt, minutesAgo, detail };
  });
}
