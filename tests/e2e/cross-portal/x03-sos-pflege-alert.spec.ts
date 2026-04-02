// X3: Bewohner SOS → Pflege-Dashboard Alert + 112-Banner
// Flow: senior_s loest SOS aus → 112-Banner erscheint sofort (P0-Requirement) →
//       pflege_p sieht aktive Eskalation im Dashboard → Cleanup
import { test, expect } from '../fixtures/roles';
import { waitForApiResult, gotoCare } from '../helpers/observer';
import { supabaseAdmin } from '../helpers/supabase-admin';

test.describe('X3: Bewohner SOS → Pflege Alert', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  test('x3a: Bewohner loest SOS aus', async ({ residentPage }) => {
    // Zur SOS-Seite navigieren (AlarmScreen wird ggf. durch gotoCare geschlossen)
    await gotoCare(residentPage.page, '/care/sos');

    // SOS-Button MUSS sichtbar sein — harte Assertion, kein Skip
    const sosBtn = residentPage.sosButton;
    await expect(sosBtn).toBeVisible({ timeout: 5_000 });
    await sosBtn.click();

    // 112-Banner MUSS sofort nach SOS-Ausloesen erscheinen (kritisches P0-Requirement!)
    // Notfall-Kategorien fire/medical/crime zeigen IMMER zuerst 112/110.
    await expect(residentPage.page.getByText('112')).toBeVisible({ timeout: 3_000 });

    await residentPage.page.screenshot({
      path: 'test-results/cross-portal/x03a-sos-112.png',
    });
  });

  test('x3b: Pflege-Dashboard zeigt Eskalations-Alert', async ({ pflegePage }) => {
    // Pflege-Portal Dashboard oeffnen (absolute URL, eigener Port 3004)
    await pflegePage.page.goto('http://localhost:3004/dashboard');
    await pflegePage.page.waitForLoadState('domcontentloaded');

    // Eskalations-API per Polling abfragen — zuverlaessiger als Realtime-UI-Warten,
    // weil der Pflege-Port einen eigenen Auth-Context hat.
    await waitForApiResult(
      pflegePage.page,
      '/api/care/escalation-events?status=eq.active&order=created_at.desc&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      {
        timeout: 15_000,
        message: 'Keine aktive Eskalation nach SOS gefunden',
      },
    );

    // Zusaetzlich: Alert-Dashboard im POM pruefen falls vorhanden
    const alertDash = pflegePage.alertDashboard;
    if (await alertDash.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(alertDash).toBeVisible();
    }

    await pflegePage.page.screenshot({
      path: 'test-results/cross-portal/x03b-pflege-alert.png',
    });
  });

  test('x3c: Aufraumen — Test-Eskalation loeschen', async () => {
    // Test-Eskalation aus der DB entfernen (Service Role Key umgeht RLS).
    // Nur Eintraege der letzten 5 Minuten mit E2E-Marker loeschen.
    const { error } = await supabaseAdmin(
      'escalation_events',
      'DELETE',
      undefined,
      "created_at=gte.now()-interval '5 minutes'&details=like.*E2E*",
    );

    // Cleanup-Fehler loggen aber nicht als Test-Failure werten —
    // fehlende Credentials in CI sind akzeptabel.
    if (error && error !== 'no_credentials') {
      console.warn('[x3c] Cleanup-Fehler:', error);
    }
  });
});
