// X1: Bewohner Check-in → Angehoeriger sieht Heartbeat-Status
// Flow: senior_s macht Check-in (Stimmung: gut) → betreuer_t sieht aktualisierten Status
import { test, expect } from '../fixtures/roles';
import { waitForRealtimeUI, gotoCare } from '../helpers/observer';

test.describe('X1: Bewohner Check-in → Angehoeriger Status', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);

  test('x1a: Bewohner macht Check-in (gut)', async ({ residentPage }) => {
    // Direkt zum Dashboard navigieren
    await residentPage.page.goto('http://localhost:3000/dashboard');
    await residentPage.page.waitForLoadState('domcontentloaded');

    // Check-in Button suchen — kann je nach Seite als TestId oder Care-Link erscheinen
    const checkin = residentPage.checkinButton;
    if (await checkin.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await checkin.click();
      // Stimmung "gut" auswaehlen
      await residentPage.moodGood.click();
      // Bestaetigung muss erscheinen (Danke-Text oder Zustandsmeldung)
      await expect(residentPage.page.getByText(/danke|check-in|gespeichert/i))
        .toBeVisible({ timeout: 5_000 });
    } else {
      // Fallback: Check-in direkt ueber Care-Pfad aufrufen
      await gotoCare(residentPage.page, '/care/checkin');
      // Stimmungs-Button per TestId ausloesen
      await residentPage.page.getByTestId('mood-good').click();
    }

    await residentPage.page.screenshot({
      path: 'test-results/cross-portal/x01a-checkin.png',
    });
  });

  test('x1b: Angehoeriger sieht aktualisierten Heartbeat', async ({ caregiverPage }) => {
    // Zur Betreuer-Uebersicht navigieren (AlarmScreen wird ggf. geschlossen)
    await gotoCare(caregiverPage.page, '/care/uebersicht');

    // Heartbeat-Anzeige muss den frischen Status widerspiegeln.
    // waitForRealtimeUI prueft via expect().toPass() — beachtet Supabase Realtime-Verzoegerung.
    await waitForRealtimeUI(
      caregiverPage.page,
      async () => {
        // Sichtbarer Statustext: z.B. "gerade aktiv", "vor wenigen Minuten", "gut"
        await expect(caregiverPage.page.getByText(/gerade|aktiv|vor wenigen|gut/i))
          .toBeVisible();
      },
      { timeout: 15_000 },
    );

    // Alternativ: typisierter Getter aus CaregiverPage POM pruefen
    // heartbeatStatus kann auch den aktualisierten Wert tragen
    const heartbeatEl = caregiverPage.heartbeatStatus;
    if (await heartbeatEl.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(heartbeatEl).not.toBeEmpty();
    }

    await caregiverPage.page.screenshot({
      path: 'test-results/cross-portal/x01b-caregiver-status.png',
    });
  });
});
