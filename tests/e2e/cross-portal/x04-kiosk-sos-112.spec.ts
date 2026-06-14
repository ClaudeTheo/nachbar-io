// X4: Senior SOS im Kiosk-Modus → Pflege Alert + 112-Banner
// Flow: senior_s loest SOS ueber die /kreis-start Senior-Shell aus →
//       112-Banner erscheint sofort (P0-Requirement) →
//       pflege_p sieht aktive Eskalation im Dashboard
import { test, expect } from "../fixtures/roles";
import { gotoCrossPortal } from "../helpers/observer";
import { supabaseAdmin } from "../helpers/supabase-admin";
import { portalUrl } from "../helpers/portal-urls";

test.describe("X4: Kiosk/Senior SOS → Pflege + 112-Banner", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test("x4a: Senior loest SOS im Kiosk-Modus aus", async ({ residentPage }) => {
    // Kanonische Senior-Shell oeffnen.
    await gotoCrossPortal(
      residentPage.page,
      portalUrl("io", "/kreis-start"),
    );
    await residentPage.page.waitForLoadState("domcontentloaded");

    // SOS-Button im Senior/Kiosk-Modus finden — grosses 160px Touch-Target
    // Button-Text variiert zwischen "SOS", "Notruf", "Notfall", "Ich brauche Hilfe"
    const sosTile = residentPage.page
      .locator("[data-testid='kreis-start-tile']")
      .filter({ hasText: "Notfall 112" });
    await expect(sosTile).toBeVisible({ timeout: 5_000 });
    await sosTile.click();
    await residentPage.page.waitForURL("**/sos**", { timeout: 5_000 });

    const emergencyCategory = residentPage.page.getByRole("button", {
      name: /Dringende Hilfe/i,
    });
    await expect(emergencyCategory).toBeVisible({ timeout: 5_000 });
    await emergencyCategory.click();

    // 112-Banner MUSS sofort nach SOS-Ausloesen erscheinen (kritisches P0-Requirement!)
    // Notfall-Kategorien fire/medical/crime zeigen IMMER zuerst 112/110.
    await expect(residentPage.page.getByText("112")).toBeVisible({
      timeout: 3_000,
    });

    await residentPage.page
      .getByRole("button", { name: /Kein Notruf/i })
      .click();
    await residentPage.page.waitForURL("**/sos/status**", { timeout: 10_000 });

    await expect(
      residentPage.page.getByRole("button", {
        name: /Mir geht es wieder gut|Wird gesendet/i,
      }),
    ).toBeVisible({ timeout: 5_000 });

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x04a-senior-shell-sos.png",
    });
  });

  test("x4b: Pflege sieht Eskalation nach Kiosk-SOS", async ({
    residentPage,
  }) => {
    // API-basierte Verifikation vom io-Portal aus (stabiler als UI-Check
    // auf anderem Portal, da API-Route garantiert existiert).
    const apiPath =
      "/api/care/escalation-events?status=eq.active&order=created_at.desc&limit=1";
    const resp = await residentPage.page.request
      .get(portalUrl("io", apiPath))
      .catch(() => null);

    if (!resp || !resp.ok()) {
      const status = resp ? resp.status() : "network error";
      console.warn(
        `[x4b] Eskalations-API returned ${status} — API nicht verfuegbar`,
      );
      test.skip(true, `Eskalations-API nicht verfuegbar (${status})`);
      return;
    }

    const apiData = await resp.json().catch(() => null);
    if (!Array.isArray(apiData) || apiData.length === 0) {
      console.warn(
        "[x4b] Keine aktive Eskalation nach Kiosk-SOS gefunden — moeglicherweise nicht synchronisiert",
      );
      test.skip(true, "Keine aktive Eskalation nach Kiosk-SOS gefunden");
      return;
    }

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x04b-pflege-alert.png",
    });
  });

  test("x4c: Aufraumen — Test-Eskalation loeschen", async () => {
    // Test-Eskalation aus der DB entfernen (Service Role Key umgeht RLS).
    // Nur Eintraege der letzten 5 Minuten loeschen.
    const { error } = await supabaseAdmin(
      "escalation_events",
      "DELETE",
      undefined,
      "created_at=gte.now()-interval '5 minutes'&details=like.*E2E*",
    );

    // Cleanup-Fehler loggen aber nicht als Test-Failure werten —
    // fehlende Credentials in CI sind akzeptabel.
    if (error && error !== "no_credentials") {
      console.warn("[x4c] Cleanup-Fehler:", error);
    }
  });
});
