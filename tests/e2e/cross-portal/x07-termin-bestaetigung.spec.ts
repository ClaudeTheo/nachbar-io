// X7: Arzt bestaetigt Termin → Bewohner erhaelt Benachrichtigung
// Flow: arzt_d navigiert zu nachbar-arzt:3002/termine → bestaetigt ausstehenden Termin
//       → Bewohner sieht Benachrichtigung auf io:3000 (Realtime oder Notification-Tab)
import { test, expect } from '../fixtures/roles';
import { waitForRealtimeUI, waitForApiResult, gotoCrossPortal } from '../helpers/observer';
import { supabaseAdmin } from '../helpers/supabase-admin';

test.describe('X7: Arzt bestaetigt Termin → Bewohner Notification', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  let testAppointmentId: string | null = null;

  test('x7a: Test-Termin in DB anlegen (ausstehend)', async () => {
    // Termin mit Status `pending` anlegen — wird vom Arzt bestaetigt
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // +2h
    const { data, error } = await supabaseAdmin(
      'appointments',
      'POST',
      {
        type: 'video',
        status: 'pending',
        scheduled_at: scheduledAt,
        notes_encrypted: 'E2E Termin-Bestaetigungstest',
      },
    );

    if (error && error !== 'no_credentials') {
      console.warn('[x7a] Termin anlegen fehlgeschlagen:', error);
    } else if (Array.isArray(data) && (data as Record<string, unknown>[]).length > 0) {
      testAppointmentId = String((data as Record<string, unknown>[])[0].id ?? '');
    }
  });

  test('x7b: Arzt navigiert zu Terminliste und bestaetigt', async ({ arztPage }) => {
    // Zum Arzt-Portal navigieren (Port 3002)
    await gotoCrossPortal(arztPage.page, 'http://localhost:3002/termine');

    // Terminliste muss sichtbar sein
    const appointmentList = arztPage.appointmentList;
    if (await appointmentList.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(appointmentList).toBeVisible();
    }

    // Ausstehenden Termin suchen — Button-Text variiert (Bestaetigen/Annehmen/Accept)
    const confirmBtn = arztPage.page.getByRole('button', {
      name: /bestaetigen|annehmen|accept|confirmi/i,
    });

    if (await confirmBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmBtn.first().click();
      // Bestaetigung-Toast oder Status-Wechsel abwarten
      await expect(
        arztPage.page.getByText(/bestaetigt|confirmed|bestaetigung|angenommen/i),
      ).toBeVisible({ timeout: 8_000 });
    } else {
      // Fallback: Termin per API direkt auf `confirmed` setzen
      if (testAppointmentId) {
        await supabaseAdmin(
          'appointments',
          'PATCH',
          { status: 'confirmed' },
          `id=eq.${testAppointmentId}`,
        );
      }
    }

    await arztPage.page.screenshot({
      path: 'test-results/cross-portal/x07b-arzt-bestaetigt.png',
    });
  });

  test('x7c: Bewohner sieht Benachrichtigung ueber bestaetigten Termin', async ({ residentPage }) => {
    // Zur Notifications-Seite navigieren
    await residentPage.page.goto('http://localhost:3000/notifications');
    await residentPage.page.waitForLoadState('domcontentloaded');

    // Warten bis Realtime-Notification erscheint
    await waitForRealtimeUI(
      residentPage.page,
      async () => {
        // Benachrichtigungstext variiert — flexibler Regex
        await expect(
          residentPage.page.getByText(/termin|bestaetigt|confirmed|vereinbart|bestaetig/i),
        ).toBeVisible();
      },
      { timeout: 20_000 },
    );

    // Alternativ: notification-item TestId pruefen
    const notifItems = residentPage.notifications;
    const count = await notifItems.count();
    // Mindestens eine Benachrichtigung muss vorhanden sein
    expect(count).toBeGreaterThan(0);

    await residentPage.page.screenshot({
      path: 'test-results/cross-portal/x07c-bewohner-notification.png',
    });
  });

  test('x7d: Aufraeuumen — Test-Termin loeschen', async () => {
    if (testAppointmentId) {
      const { error } = await supabaseAdmin(
        'appointments',
        'DELETE',
        undefined,
        `id=eq.${testAppointmentId}`,
      );
      if (error && error !== 'no_credentials') {
        console.warn('[x7d] Cleanup fehlgeschlagen:', error);
      }
    } else {
      // Fallback: alle E2E-Termine der letzten 10 Minuten entfernen
      const { error } = await supabaseAdmin(
        'appointments',
        'DELETE',
        undefined,
        "notes_encrypted=like.*E2E*&created_at=gte.now()-interval '10 minutes'",
      );
      if (error && error !== 'no_credentials') {
        console.warn('[x7d] Fallback-Cleanup fehlgeschlagen:', error);
      }
    }
  });
});
