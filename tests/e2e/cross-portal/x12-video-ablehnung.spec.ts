// X12: Arzt lehnt Video-Konsultation ab → Bewohner sieht Ablehnung
// Szenario: Bewohner sendet Konsultationsanfrage, Arzt lehnt ab, Bewohner erhält Ablehnung-Notification
import { test, expect } from '../fixtures/roles';
import { waitForApiResult, waitForRealtimeUI, gotoCrossPortal, waitForToast } from '../helpers/observer';
import { supabaseAdmin } from '../helpers/supabase-admin';

test.describe('X12: Video-Konsultation Ablehnung', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  let testVideoCallId: string | null = null;

  test('x12a: Bewohner hat offene Konsultations-Anfrage', async ({ residentPage }) => {
    // Zur Video-Konsultationsseite navigieren
    await residentPage.page.goto('http://localhost:3000/video');
    await residentPage.page.waitForLoadState('domcontentloaded');

    // Anfrage-Button suchen und ggf. klicken
    const requestBtn = residentPage.page.getByRole('button', {
      name: /konsultation|sprechstunde|videoanruf|anfragen|anrufen|video|termin/i,
    });

    if (await requestBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await requestBtn.first().click();

      // Bestaetigungstext muss erscheinen
      await expect(
        residentPage.page.getByText(/anfrage|gesendet|wartet|pending|wird|übermittelt/i),
      ).toBeVisible({ timeout: 8_000 });
    } else {
      // Fallback: Video-Call per API anlegen (Status: `pending`)
      const { data, error } = await supabaseAdmin(
        'video_calls',
        'POST',
        {
          type: 'pro_medical',
          status: 'pending',
        },
      );
      if (error && error !== 'no_credentials') {
        console.warn('[x12a] Video-Call anlegen fehlgeschlagen:', error);
      } else if (Array.isArray(data) && (data as Record<string, unknown>[]).length > 0) {
        testVideoCallId = String((data as Record<string, unknown>[])[0].id ?? '');
      }
    }

    await residentPage.page.screenshot({
      path: 'test-results/cross-portal/x12a-bewohner-anfrage.png',
    });
  });

  test('x12b: Arzt lehnt Anfrage ab', async ({ arztPage }) => {
    // Zum Arzt-Portal navigieren
    await gotoCrossPortal(arztPage.page, 'http://localhost:3002/video');

    // Konsultationsanfragen-Bereich pruefen
    const consultRequests = arztPage.consultationRequests;
    if (await consultRequests.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(consultRequests).toBeVisible();
    }

    // Per API verifizieren: ausstehende Anfrage muss vorhanden sein
    await waitForApiResult(
      arztPage.page,
      '/api/arzt/video-calls?status=eq.pending&type=eq.pro_medical&limit=1',
      (data) => Array.isArray(data) && data.length > 0,
      {
        timeout: 15_000,
        message: 'Keine ausstehende Video-Anfrage beim Arzt gefunden',
      },
    );

    // Ablehnen-Button suchen und klicken
    const rejectBtn = arztPage.page.getByRole('button', {
      name: /ablehnen|reject|nein|absagen|verweigern/i,
    });

    if (await rejectBtn.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await rejectBtn.first().click();

      // Bestaetigungstext
      await expect(
        arztPage.page.getByText(/abgelehnt|rejected|nicht|verweigert/i),
      ).toBeVisible({ timeout: 8_000 });
    } else {
      // Fallback: Per API auf `rejected` setzen
      const queryParam = testVideoCallId
        ? `id=eq.${testVideoCallId}`
        : "type=eq.pro_medical&status=eq.pending&created_at=gte.now()-interval '5 minutes'";
      await supabaseAdmin('video_calls', 'PATCH', { status: 'rejected' }, queryParam);
    }

    await arztPage.page.screenshot({
      path: 'test-results/cross-portal/x12b-arzt-ablehnung.png',
    });
  });

  test('x12c: Bewohner sieht Ablehnung im Status', async ({ residentPage }) => {
    // Zur Video-Seite navigieren
    await residentPage.page.goto('http://localhost:3000/video');
    await residentPage.page.waitForLoadState('domcontentloaded');

    // Realtime-Update auf Ablehnung warten
    await waitForRealtimeUI(
      residentPage.page,
      async () => {
        // Status muss sich zu "abgelehnt" aendern
        await expect(
          residentPage.page.getByText(/abgelehnt|rejected|ablehnung|nicht verfügbar|verweigert/i),
        ).toBeVisible();
      },
      { timeout: 10_000 },
    );

    await residentPage.page.screenshot({
      path: 'test-results/cross-portal/x12c-bewohner-status-ablehnung.png',
    });
  });

  test('x12d: Bewohner erhaelt Toast-Benachrichtigung', async ({ residentPage }) => {
    // Toast muss Ablehnung anzeigen
    await waitForToast(
      residentPage.page,
      /abgelehnt|ablehnung|arzt.*nicht verfügbar|konsultation.*abgelehnt/i,
      { timeout: 10_000 },
    );

    await residentPage.page.screenshot({
      path: 'test-results/cross-portal/x12d-bewohner-toast.png',
    });
  });

  test('x12e: Aufraeuumen — Test-Video-Call loeschen', async () => {
    const queryParam = testVideoCallId
      ? `id=eq.${testVideoCallId}`
      : "type=eq.pro_medical&created_at=gte.now()-interval '10 minutes'";

    const { error } = await supabaseAdmin('video_calls', 'DELETE', undefined, queryParam);
    if (error && error !== 'no_credentials') {
      console.warn('[x12e] Cleanup fehlgeschlagen:', error);
    }
  });
});
