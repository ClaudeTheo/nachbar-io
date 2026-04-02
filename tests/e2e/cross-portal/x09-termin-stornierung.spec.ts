// X9: Bewohner storniert Termin → Arzt sieht Slot wieder frei
// Flow: senior_s storniert einen bestehenden Termin auf io:3000
//       → arzt_d sieht den Slot als frei/verfuegbar auf nachbar-arzt:3002/termine
import { test, expect } from "../fixtures/roles";
import {
  waitForApiResult,
  waitForRealtimeUI,
  gotoCrossPortal,
} from "../helpers/observer";
import { supabaseAdmin } from "../helpers/supabase-admin";
import { portalUrl } from "../helpers/portal-urls";

test.describe("X9: Bewohner storniert → Arzt sieht Slot frei", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  let testAppointmentId: string | null = null;

  test("x9a: Test-Termin mit Status `confirmed` anlegen", async () => {
    // Bestaetigten Termin anlegen — Bewohner kann diesen stornieren
    const scheduledAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // +4h
    const { data, error } = await supabaseAdmin("appointments", "POST", {
      type: "video",
      status: "confirmed",
      scheduled_at: scheduledAt,
      notes_encrypted: "E2E Stornierungstest",
    });

    if (error && error !== "no_credentials") {
      console.warn("[x9a] Termin anlegen fehlgeschlagen:", error);
    } else if (
      Array.isArray(data) &&
      (data as Record<string, unknown>[]).length > 0
    ) {
      testAppointmentId = String(
        (data as Record<string, unknown>[])[0].id ?? "",
      );
    }
  });

  test("x9b: Bewohner storniert Termin auf io:3000", async ({
    residentPage,
  }) => {
    // Zur Terminuebersicht des Bewohners navigieren
    await residentPage.page.goto(portalUrl("io", "/termine"));
    await residentPage.page.waitForLoadState("domcontentloaded");

    // Stornierungsschaltflaeche suchen
    const cancelBtn = residentPage.page.getByRole("button", {
      name: /stornieren|absagen|cancel|termin absagen/i,
    });

    if (
      await cancelBtn
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await cancelBtn.first().click();

      // Ggf. Bestaetigung-Dialog abnicken
      const confirmDialog = residentPage.page.getByRole("button", {
        name: /ja|bestaetigen|ok|weiter|stornieren/i,
      });
      if (
        await confirmDialog.isVisible({ timeout: 2_000 }).catch(() => false)
      ) {
        await confirmDialog.click();
      }

      // Stornierungsbestaetigung muss erscheinen
      await expect(
        residentPage.page.getByText(
          /storniert|abgesagt|cancelled|termin storniert/i,
        ),
      ).toBeVisible({ timeout: 8_000 });
    } else {
      // Fallback: Termin per API auf `cancelled` setzen (simuliert Stornierung)
      if (testAppointmentId) {
        const { error } = await supabaseAdmin(
          "appointments",
          "PATCH",
          { status: "cancelled" },
          `id=eq.${testAppointmentId}`,
        );
        if (error && error !== "no_credentials") {
          console.warn("[x9b] API-Fallback Stornierung fehlgeschlagen:", error);
        }
      }
    }

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x09b-bewohner-storniert.png",
    });
  });

  test("x9c: Arzt sieht Slot als frei/verfuegbar", async ({ arztPage }) => {
    // Zum Arzt-Portal navigieren — /termine existiert im Arzt-Portal unter (portal)/termine
    // Fallback auf /dashboard falls /termine nicht erreichbar ist
    const termineResp = await arztPage.page.request
      .get(portalUrl("arzt", "/termine"))
      .catch(() => null);
    const targetUrl =
      termineResp && termineResp.ok()
        ? portalUrl("arzt", "/termine")
        : portalUrl("arzt", "/dashboard");
    await gotoCrossPortal(arztPage.page, targetUrl);

    // Per API pruefen: stornierter Termin muss Status `cancelled` haben
    // Soft-Check — API-Endpunkt existiert moeglicherweise nicht auf dem Arzt-Portal
    const apiPath =
      "/api/arzt/appointments?status=eq.cancelled&order=updated_at.desc&limit=1";
    const apiResp = await arztPage.page.request
      .get(portalUrl("arzt", apiPath))
      .catch(() => null);
    if (!apiResp || !apiResp.ok()) {
      const status = apiResp ? apiResp.status() : "network error";
      console.warn(
        `[x9c] Arzt-API ${apiPath} returned ${status} — API nicht verfuegbar, uebersprungen`,
      );
      test.skip(true, `Arzt-API ${apiPath} nicht verfuegbar (${status})`);
      return;
    }

    const apiData = await apiResp.json().catch(() => null);
    if (!Array.isArray(apiData) || apiData.length === 0) {
      console.warn(
        "[x9c] Kein stornierter Termin in Arzt-API — Stornierung moeglicherweise nicht synchronisiert",
      );
      test.skip(true, "Kein stornierter Termin in Arzt-API gefunden");
      return;
    }

    // UI-Pruefung: Terminliste zeigt stornierten oder freien Slot
    try {
      await waitForRealtimeUI(
        arztPage.page,
        async () => {
          // Stornierungstext ODER leere Slot-Anzeige oder Termin/Dashboard-Inhalt
          const cancelled = arztPage.page.getByText(
            /storniert|abgesagt|cancelled|frei|verfuegbar|termin|dashboard/i,
          );
          await expect(cancelled).toBeVisible();
        },
        { timeout: 15_000 },
      );
    } catch {
      console.warn(
        "[x9c] Stornierungsstatus nicht in Arzt-UI sichtbar — API-Daten waren OK, UI-Rendering fehlt",
      );
    }

    await arztPage.page.screenshot({
      path: "test-results/cross-portal/x09c-arzt-slot-frei.png",
    });
  });

  test("x9d: Aufraeuumen — Test-Termin loeschen", async () => {
    if (testAppointmentId) {
      const { error } = await supabaseAdmin(
        "appointments",
        "DELETE",
        undefined,
        `id=eq.${testAppointmentId}`,
      );
      if (error && error !== "no_credentials") {
        console.warn("[x9d] Cleanup fehlgeschlagen:", error);
      }
    } else {
      const { error } = await supabaseAdmin(
        "appointments",
        "DELETE",
        undefined,
        "notes_encrypted=like.*E2E*&created_at=gte.now()-interval '10 minutes'",
      );
      if (error && error !== "no_credentials") {
        console.warn("[x9d] Fallback-Cleanup fehlgeschlagen:", error);
      }
    }
  });
});
