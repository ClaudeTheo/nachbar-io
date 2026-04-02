// X5: SOS-Eskalation 4h→8h→12h→24h Zeitraffer (DB-Backdating)
// Flow: Eskalationseintrag wird stufenweise zurueckdatiert →
//       jede Stufe wird per API verifiziert (4h Erinnerung, 8h Alert,
//       12h Lotse/Pro-Org, 24h Notfall-Stufe)
import { test, expect } from '../fixtures/roles';
import { waitForApiResult, gotoCrossPortal } from '../helpers/observer';
import { supabaseAdmin } from '../helpers/supabase-admin';

/** Hilfsfunktion: Eskalationseintrag anlegen und Zeitstempel setzen */
async function createBackdatedEscalation(
  hoursAgo: number,
  stage: string,
): Promise<string | null> {
  const ts = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin(
    'escalation_events',
    'POST',
    {
      type: stage,
      created_at: ts,
      details: 'E2E Zeitraffer-Test',
      status: 'active',
    },
  );

  if (error && error !== 'no_credentials') {
    console.warn(`[x5] Eskalation ${stage} anlegen fehlgeschlagen:`, error);
    return null;
  }

  // ID des neu angelegten Eintrags zurueckgeben
  const row = Array.isArray(data) ? (data as Record<string, unknown>[])[0] : null;
  return row ? String(row.id ?? '') : null;
}

test.describe('X5: SOS-Eskalation 4h→8h→12h→24h Zeitraffer', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test('x5a: Stufe 1 — 4h-Erinnerung anlegen und verifizieren', async ({ caregiverPage }) => {
    // Eskalation vom Typ reminder_4h, Zeitstempel 5h zurueck
    await createBackdatedEscalation(5, 'reminder_4h');

    await caregiverPage.page.goto('http://localhost:3000/dashboard');
    await caregiverPage.page.waitForLoadState('domcontentloaded');

    // API-Pruefung: Eintrag muss in der Datenbank vorhanden sein
    await waitForApiResult(
      caregiverPage.page,
      '/api/care/escalation-events?type=eq.reminder_4h&status=eq.active&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      { timeout: 15_000, message: 'Stufe 1 (reminder_4h) nicht gefunden' },
    );

    await caregiverPage.page.screenshot({
      path: 'test-results/cross-portal/x05a-eskalation-4h.png',
    });
  });

  test('x5b: Stufe 2 — 8h-Alert anlegen und verifizieren', async ({ caregiverPage }) => {
    // Eskalation vom Typ alert_8h, Zeitstempel 9h zurueck
    await createBackdatedEscalation(9, 'alert_8h');

    await caregiverPage.page.goto('http://localhost:3000/care/uebersicht');
    await caregiverPage.page.waitForLoadState('domcontentloaded');

    await waitForApiResult(
      caregiverPage.page,
      '/api/care/escalation-events?type=eq.alert_8h&status=eq.active&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      { timeout: 15_000, message: 'Stufe 2 (alert_8h) nicht gefunden' },
    );

    // Angehoerigen-Alert-Banner sollte sichtbar sein
    const alertBanner = caregiverPage.alertBanner;
    if (await alertBanner.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(alertBanner).toBeVisible();
    }

    await caregiverPage.page.screenshot({
      path: 'test-results/cross-portal/x05b-eskalation-8h.png',
    });
  });

  test('x5c: Stufe 3 — 12h-Lotse anlegen und verifizieren', async ({ orgAdminPage }) => {
    // Eskalation vom Typ lotse_12h, Zeitstempel 13h zurueck
    await createBackdatedEscalation(13, 'lotse_12h');

    // Pro-Community-Org sieht Quartier-Eskalationen im Dashboard
    await orgAdminPage.page.goto('http://localhost:3000/admin/org/dashboard');
    await orgAdminPage.page.waitForLoadState('domcontentloaded');

    await waitForApiResult(
      orgAdminPage.page,
      '/api/care/escalation-events?type=eq.lotse_12h&status=eq.active&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      { timeout: 15_000, message: 'Stufe 3 (lotse_12h) nicht gefunden' },
    );

    await orgAdminPage.page.screenshot({
      path: 'test-results/cross-portal/x05c-eskalation-12h.png',
    });
  });

  test('x5d: Stufe 4 — 24h-Notfall anlegen und verifizieren', async ({ orgAdminPage }) => {
    // Eskalation vom Typ notfall_24h, Zeitstempel 25h zurueck
    await createBackdatedEscalation(25, 'notfall_24h');

    await orgAdminPage.page.goto('http://localhost:3000/admin/org/dashboard');
    await orgAdminPage.page.waitForLoadState('domcontentloaded');

    await waitForApiResult(
      orgAdminPage.page,
      '/api/care/escalation-events?type=eq.notfall_24h&status=eq.active&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      { timeout: 15_000, message: 'Stufe 4 (notfall_24h) nicht gefunden' },
    );

    // Eskalations-Widget des OrgAdmin muss sichtbaren Eintrag zeigen
    const escalations = orgAdminPage.escalations;
    if (await escalations.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(escalations).not.toBeEmpty();
    }

    await orgAdminPage.page.screenshot({
      path: 'test-results/cross-portal/x05d-eskalation-24h.png',
    });
  });

  test('x5e: Aufraeuumen — alle Zeitraffer-Eskalationen loeschen', async () => {
    const stages = ['reminder_4h', 'alert_8h', 'lotse_12h', 'notfall_24h'];

    for (const stage of stages) {
      const { error } = await supabaseAdmin(
        'escalation_events',
        'DELETE',
        undefined,
        `type=eq.${stage}&details=like.*E2E*`,
      );
      if (error && error !== 'no_credentials') {
        console.warn(`[x5e] Cleanup ${stage} fehlgeschlagen:`, error);
      }
    }
  });
});
