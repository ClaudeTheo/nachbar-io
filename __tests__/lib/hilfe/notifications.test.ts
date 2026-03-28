// __tests__/lib/hilfe/notifications.test.ts
// Unit-Tests fuer Push-Notification Builder

import { describe, it, expect } from 'vitest';
import {
  buildHelpRequestNotification,
  buildMatchNotification,
  buildSignatureReminder,
} from '@/modules/hilfe/services/notifications';

describe('hilfe/notifications', () => {
  it('buildHelpRequestNotification: Titel enthaelt "Hilfe-Gesuch", Body enthaelt Kategorie-Label, URL ist /hilfe', () => {
    const payload = buildHelpRequestNotification('einkaufen', 'Brot und Milch vom Supermarkt');

    expect(payload.title).toContain('Hilfe-Gesuch');
    expect(payload.body).toContain('Einkaufen');
    expect(payload.body).toContain('Brot und Milch');
    expect(payload.url).toBe('/hilfe');
    expect(payload.tag).toMatch(/^help-request-\d+$/);
  });

  it('buildMatchNotification: Titel enthaelt "Helfer gefunden", Body enthaelt Helfername', () => {
    const payload = buildMatchNotification('Maria Schmidt', 'haushalt');

    expect(payload.title).toContain('Helfer gefunden');
    expect(payload.body).toContain('Maria Schmidt');
    expect(payload.body).toContain('Haushalt');
    expect(payload.url).toBe('/hilfe');
    expect(payload.tag).toMatch(/^help-match-\d+$/);
  });

  it('buildSignatureReminder: Titel enthaelt "Unterschrift", URL enthaelt sessionId', () => {
    const sessionId = 'abc-123-def';
    const payload = buildSignatureReminder(sessionId);

    expect(payload.title).toContain('Unterschrift');
    expect(payload.body).toContain('Quittung');
    expect(payload.url).toContain(sessionId);
    expect(payload.url).toBe(`/hilfe/einsatz/${sessionId}`);
    expect(payload.tag).toBe(`help-sign-${sessionId}`);
  });
});
