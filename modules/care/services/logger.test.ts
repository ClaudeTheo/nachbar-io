// lib/care/logger.test.ts
// Nachbar.io — Tests fuer strukturiertes JSON-Logging

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCareLogger } from './logger';

describe('createCareLogger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generiert eine 12-Zeichen requestId', () => {
    const log = createCareLogger('care/sos');
    expect(log.requestId).toBeTruthy();
    expect(log.requestId.length).toBe(12);
  });

  it('nutzt uebergebene requestId wenn vorhanden', () => {
    const log = createCareLogger('care/sos', 'custom-req-1');
    expect(log.requestId).toBe('custom-req-1');
  });

  describe('info()', () => {
    it('gibt JSON-Log auf console.log aus', () => {
      const log = createCareLogger('care/sos', 'req-123');
      log.info('sos_triggered', { userId: 'user-1', category: 'medical_emergency' });

      expect(logSpy).toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);

      expect(output.level).toBe('info');
      expect(output.route).toBe('care/sos');
      expect(output.event).toBe('sos_triggered');
      expect(output.requestId).toBe('req-123');
      expect(output.metadata).toEqual({ userId: 'user-1', category: 'medical_emergency' });
      expect(output.timestamp).toBeTruthy();
    });
  });

  describe('warn()', () => {
    it('gibt JSON-Log auf console.warn aus', () => {
      const log = createCareLogger('care/checkin', 'req-456');
      log.warn('audit_log_failed', { checkinId: 'ci-1' });

      expect(warnSpy).toHaveBeenCalled();
      const output = JSON.parse(warnSpy.mock.calls[0][0] as string);

      expect(output.level).toBe('warn');
      expect(output.event).toBe('audit_log_failed');
    });
  });

  describe('error()', () => {
    it('gibt JSON-Log auf console.error mit Fehlermeldung aus', () => {
      const log = createCareLogger('care/sos', 'req-789');
      log.error('db_insert_failed', new Error('Connection timeout'), { alertId: 'alert-1' });

      expect(errorSpy).toHaveBeenCalled();
      const output = JSON.parse(errorSpy.mock.calls[0][0] as string);

      expect(output.level).toBe('error');
      expect(output.error).toBe('Connection timeout');
      expect(output.metadata).toEqual({ alertId: 'alert-1' });
    });

    it('behandelt nicht-Error-Objekte als Fehler', () => {
      const log = createCareLogger('care/sos', 'req-abc');
      log.error('unknown_error', 'string error');

      expect(errorSpy).toHaveBeenCalled();
      const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(output.error).toBe('string error');
    });

    it('behandelt undefined-Fehler', () => {
      const log = createCareLogger('care/sos', 'req-def');
      log.error('no_error_given');

      expect(errorSpy).toHaveBeenCalled();
      const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
      expect(output.error).toBe('');
    });
  });

  describe('done()', () => {
    it('gibt Abschluss-Log mit Dauer und Statuscode aus', () => {
      const log = createCareLogger('care/sos', 'req-fin');
      log.done(201, { alertId: 'alert-99' });

      expect(logSpy).toHaveBeenCalled();
      // Letzter console.log-Aufruf nehmen (done ist immer info-Level)
      const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      const output = JSON.parse(lastCall[0] as string);

      expect(output.event).toBe('request_complete');
      expect(output.duration_ms).toBeGreaterThanOrEqual(0);
      expect(output.metadata?.statusCode).toBe(201);
      expect(output.metadata?.alertId).toBe('alert-99');
    });
  });

  it('gibt valides JSON aus (maschinell parsebar)', () => {
    const log = createCareLogger('care/cron/escalation', 'req-json');
    log.info('test_event', { key: 'value' });

    expect(logSpy).toHaveBeenCalled();
    const rawOutput = logSpy.mock.calls[0][0] as string;
    expect(() => JSON.parse(rawOutput)).not.toThrow();
  });
});
