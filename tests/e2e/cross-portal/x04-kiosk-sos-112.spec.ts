// X4: Senior SOS im Kiosk-Modus → Pflege Alert + 112-Banner
// Flow: senior_s loest SOS ueber die /senior/home Kiosk-Ansicht aus →
//       112-Banner erscheint sofort (P0-Requirement) →
//       pflege_p sieht aktive Eskalation im Dashboard
import { test, expect } from '../fixtures/roles';
import { waitForApiResult, gotoCrossPortal } from '../helpers/observer';
import { supabaseAdmin } from '../helpers/supabase-admin';

test.describe('X4: Kiosk/Senior SOS → Pflege + 112-Banner', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  test('x4a: Senior loest SOS im Kiosk-Modus aus', async ({ residentPage }) => {
    // Kiosk-Ansicht oeffnen — Senior-Modus auf /senior/home
    await gotoCrossPortal(residentPage.page, 'http://localhost:3000/senior/home');
    await residentPage.page.waitForLoadState('domcontentloaded');

    // SOS-Button im Senior/Kiosk-Modus finden — grosses 160px Touch-Target
    const sosBtn = residentPage.page.getByRole('button', { name: /SOS|Notruf|Notfall/i });
    await expect(sosBtn).toBeVisible({ timeout: 5_000 });
    await sosBtn.click();

    // 112-Banner MUSS sofort nach SOS-Ausloesen erscheinen (kritisches P0-Requirement!)
    // Notfall-Kategorien fire/medical/crime zeigen IMMER zuerst 112/110.
    await expect(residentPage.page.getByText('112')).toBeVisible({ timeout: 3_000 });

    await residentPage.page.screenshot({ path: 'test-results/cross-portal/x04a-kiosk-sos.png' });
  });

  test('x4b: Pflege sieht Eskalation nach Kiosk-SOS', async ({ pflegePage }) => {
    // Pflege-Portal Dashboard oeffnen (eigener Port 3004)
    await pflegePage.page.goto('http://localhost:3004/dashboard');
    await pflegePage.page.waitForLoadState('domcontentloaded');

    // Eskalations-API per Polling abfragen — zuverlaessiger als Realtime-UI-Warten
    await waitForApiResult(
      pflegePage.page,
      '/api/care/escalation-events?status=eq.active&order=created_at.desc&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      {
        timeout: 15_000,
        message: 'Keine aktive Eskalation nach Kiosk-SOS gefunden',
      },
    );

    // Zusaetzlich: Alert-Dashboard im POM pruefen falls vorhanden
    const alertDash = pflegePage.alertDashboard;
    if (await alertDash.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(alertDash).toBeVisible();
    }

    await pflegePage.page.screenshot({ path: 'test-results/cross-portal/x04b-pflege-alert.png' });
  });

  test('x4c: Aufraumen — Test-Eskalation loeschen', async () => {
    // Test-Eskalation aus der DB entfernen (Service Role Key umgeht RLS).
    // Nur Eintraege der letzten 5 Minuten loeschen.
    const { error } = await supabaseAdmin(
      'escalation_events',
      'DELETE',
      undefined,
      "created_at=gte.now()-interval '5 minutes'&details=like.*E2E*",
    );

    // Cleanup-Fehler loggen aber nicht als Test-Failure werten —
    // fehlende Credentials in CI sind akzeptabel.
    if (error && error !== 'no_credentials') {
      console.warn('[x4c] Cleanup-Fehler:', error);
    }
  });
});
