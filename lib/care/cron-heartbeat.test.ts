// lib/care/cron-heartbeat.test.ts
// Nachbar.io — Tests fuer Cron-Heartbeat-Monitoring (FMEA FM-SOS-03, FM-CI-01, FM-MED-01)

import { describe, it, expect, vi } from 'vitest';
import { CRON_JOBS, writeCronHeartbeat, checkCronHealth } from './cron-heartbeat';
import type { CronJobId } from './cron-heartbeat';

// Einfacher Supabase-Mock
function createMockSupabase(heartbeats: Array<{ job_id: string; last_run_at: string; metadata: unknown }> = []) {
  const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const selectFn = vi.fn().mockResolvedValue({ data: heartbeats, error: null });

  return {
    supabase: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'cron_heartbeats') {
          return {
            upsert: upsertFn,
            select: selectFn,
          };
        }
        return { upsert: vi.fn(), select: vi.fn() };
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient,
    upsertFn,
    selectFn,
  };
}

describe('CRON_JOBS Konfiguration', () => {
  it('definiert alle 4 Cron-Jobs', () => {
    const jobIds: CronJobId[] = ['escalation', 'checkin', 'medications', 'appointments'];
    for (const id of jobIds) {
      expect(CRON_JOBS[id]).toBeDefined();
      expect(CRON_JOBS[id].name).toBeTruthy();
      expect(CRON_JOBS[id].expectedIntervalMinutes).toBeGreaterThan(0);
      expect(CRON_JOBS[id].criticalAfterMinutes).toBeGreaterThan(CRON_JOBS[id].expectedIntervalMinutes);
    }
  });

  it('Eskalation hat das kuerzeste Intervall (sicherheitskritisch)', () => {
    expect(CRON_JOBS.escalation.expectedIntervalMinutes).toBeLessThanOrEqual(
      CRON_JOBS.checkin.expectedIntervalMinutes
    );
  });
});

describe('writeCronHeartbeat', () => {
  it('schreibt einen Heartbeat mit upsert', async () => {
    const { supabase, upsertFn } = createMockSupabase();

    await writeCronHeartbeat(supabase, 'escalation', { checked: 5, escalated: 1 });

    expect(supabase.from).toHaveBeenCalledWith('cron_heartbeats');
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'escalation',
        metadata: { checked: 5, escalated: 1 },
      }),
      { onConflict: 'job_id' }
    );
  });

  it('blockiert nicht bei DB-Fehler (Fire-and-Forget)', async () => {
    const { supabase, upsertFn } = createMockSupabase();
    upsertFn.mockRejectedValueOnce(new Error('DB down'));

    // Soll keinen Fehler werfen
    await expect(writeCronHeartbeat(supabase, 'checkin')).resolves.toBeUndefined();
  });

  it('setzt metadata auf null wenn nicht angegeben', async () => {
    const { supabase, upsertFn } = createMockSupabase();

    await writeCronHeartbeat(supabase, 'medications');

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'medications',
        metadata: null,
      }),
      { onConflict: 'job_id' }
    );
  });
});

describe('checkCronHealth', () => {
  it('gibt error-Status fuer Jobs ohne Heartbeat', async () => {
    const { supabase } = createMockSupabase([]); // Keine Heartbeats

    const results = await checkCronHealth(supabase);

    expect(results).toHaveLength(4); // Alle 4 Jobs
    for (const result of results) {
      expect(result.status).toBe('error');
      expect(result.lastRunAt).toBeNull();
      expect(result.minutesAgo).toBeNull();
      expect(result.detail).toContain('Noch nie');
    }
  });

  it('gibt ok-Status fuer kuerzlich ausgefuehrte Jobs', async () => {
    const recentRun = new Date().toISOString(); // Gerade eben
    const { supabase } = createMockSupabase([
      { job_id: 'escalation', last_run_at: recentRun, metadata: null },
    ]);

    const results = await checkCronHealth(supabase);
    const escalation = results.find(r => r.jobId === 'escalation')!;

    expect(escalation.status).toBe('ok');
    expect(escalation.minutesAgo).toBeLessThanOrEqual(1);
  });

  it('gibt warn-Status fuer leicht verspaetete Jobs', async () => {
    // Escalation: erwartet alle 2 Min, kritisch nach 5 Min
    // 3 Minuten her → warn
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { supabase } = createMockSupabase([
      { job_id: 'escalation', last_run_at: threeMinAgo, metadata: null },
    ]);

    const results = await checkCronHealth(supabase);
    const escalation = results.find(r => r.jobId === 'escalation')!;

    expect(escalation.status).toBe('warn');
  });

  it('gibt error-Status fuer kritisch verspaetete Jobs', async () => {
    // Escalation: kritisch nach 5 Min → 10 Min her = error
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { supabase } = createMockSupabase([
      { job_id: 'escalation', last_run_at: tenMinAgo, metadata: null },
    ]);

    const results = await checkCronHealth(supabase);
    const escalation = results.find(r => r.jobId === 'escalation')!;

    expect(escalation.status).toBe('error');
    expect(escalation.detail).toContain('UEBERFAELLIG');
  });

  it('berechnet minutesAgo korrekt', async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { supabase } = createMockSupabase([
      { job_id: 'checkin', last_run_at: fiveMinAgo, metadata: null },
    ]);

    const results = await checkCronHealth(supabase);
    const checkin = results.find(r => r.jobId === 'checkin')!;

    expect(checkin.minutesAgo).toBe(5);
  });
});
