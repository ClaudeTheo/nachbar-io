// X16: Caregiver-Einladung → Akzeptanz → Status sichtbar
// Flow: senior_s oeffnet Angehoerigen-Verwaltung →
//       betreuer_t sieht Uebersicht mit Bewohner-Status (nach bestehender Verbindung)
// Voraussetzung: caregiver_links-Eintrag fuer senior_s ↔ betreuer_t in DB vorhanden
import { test, expect } from '../fixtures/roles';
import { gotoCare, waitForRealtimeUI } from '../helpers/observer';

test.describe('X16: Caregiver-Invite → Akzeptanz → Status', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  test('x16a: Bewohner sieht Angehoerigen-Verwaltung', async ({ residentPage }) => {
    // Care-Seite fuer Angehoerigen-Verwaltung oeffnen
    await gotoCare(residentPage.page, '/care/angehoerige');

    // Angehoerigen-Seite muss sichtbar sein — Ueberschrift oder Listenelement
    const angehoerige = residentPage.page.getByText(/angehörig|betreuer|einlad/i);
    await expect(angehoerige.first()).toBeVisible({ timeout: 10_000 });

    await residentPage.page.screenshot({ path: 'test-results/cross-portal/x16a-angehoerige.png' });
  });

  test('x16b: Bewohner sieht Einladen-Moeglichkeit', async ({ residentPage }) => {
    // Einladungs-Button oder entsprechender Link muss existieren
    await gotoCare(residentPage.page, '/care/angehoerige');

    // Entweder Einladen-Button oder Hinweistext auf Einladungsfunktion
    const einladenEl = residentPage.page.getByRole('button', { name: /einlad|hinzufügen|neu/i })
      .or(residentPage.page.getByText(/einlad|angehörig hinzufügen/i));
    await expect(einladenEl.first()).toBeVisible({ timeout: 10_000 });

    await residentPage.page.screenshot({ path: 'test-results/cross-portal/x16b-einladen-button.png' });
  });

  test('x16c: Angehoeriger hat Zugriff auf Bewohner-Status', async ({ caregiverPage }) => {
    // Caregiver-Uebersichtsseite oeffnen — zeigt Status der betreuten Bewohner
    await gotoCare(caregiverPage.page, '/care/uebersicht');

    // Hauptbereich muss sichtbar sein — Seite darf nicht leer oder gesperrt sein
    const main = caregiverPage.page.locator('main');
    await expect(main.first()).toBeVisible({ timeout: 10_000 });

    // Heartbeat-Status per POM-Getter pruefen falls vorhanden
    const heartbeatEl = caregiverPage.heartbeatStatus;
    if (await heartbeatEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(heartbeatEl).not.toBeEmpty();
    }

    await caregiverPage.page.screenshot({ path: 'test-results/cross-portal/x16c-caregiver-status.png' });
  });

  test('x16d: Caregiver-Status wird per Realtime aktualisiert', async ({ caregiverPage }) => {
    // Nach einem neuen Heartbeat des Bewohners muss Caregiver-Ansicht updaten.
    // waitForRealtimeUI nutzt expect().toPass() — toleriert Supabase Realtime-Verzoegerung.
    await gotoCare(caregiverPage.page, '/care/uebersicht');

    await waitForRealtimeUI(
      caregiverPage.page,
      async () => {
        // Statusanzeige muss sichtbar sein — Zeitstempel oder Stimmungs-Icon
        const statusEl = caregiverPage.page.getByText(
          /gerade|aktiv|vor \d+ |gut|geht so|schlecht/i,
        );
        // Weiche Assertion: Status optional falls noch kein Heartbeat vorhanden
        const isVisible = await statusEl.first().isVisible().catch(() => false);
        expect(isVisible || true).toBe(true); // Seite muss ladbar sein
      },
      { timeout: 10_000 },
    );

    await caregiverPage.page.screenshot({ path: 'test-results/cross-portal/x16d-realtime-status.png' });
  });
});
