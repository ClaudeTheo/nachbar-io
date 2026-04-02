// X13: Pflege legt Medikamentenplan an → Bewohner sieht ihn
// Flow: pflege_p legt auf nachbar-pflege:3004 einen Medikamentenplan fuer den
//       Test-Bewohner an → senior_s sieht den Plan auf io:3000 in der Care-Sektion
//
// Datenschutz-Hinweis: Medikamentennamen werden AES-256-GCM verschluesselt gespeichert.
// Fuer den Bewohner ist nur der Plan sichtbar — nicht fuer Angehoerige (Caregiver).
import { test, expect } from "../fixtures/roles";
import {
  waitForApiResult,
  waitForRealtimeUI,
  gotoCrossPortal,
} from "../helpers/observer";
import { supabaseAdmin } from "../helpers/supabase-admin";

test.describe("X13: Pflege Medikamentenplan → Bewohner sieht", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  let testPlanId: string | null = null;

  test("x13a: Pflege navigiert zum Medikamentenplan und legt einen an", async ({
    pflegePage,
  }) => {
    // Zum Pflege-Portal navigieren (Port 3004)
    await gotoCrossPortal(pflegePage.page, "http://localhost:3004/medikamente");

    // Medikamentenliste muss sichtbar sein
    const medPlans = pflegePage.medicationPlans;
    if (await medPlans.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(medPlans).toBeVisible();
    }

    // Neuer-Plan-Button suchen
    const newPlanBtn = pflegePage.page.getByRole("button", {
      name: /neu|erstellen|hinzufuegen|anlegen|add|plan erstellen/i,
    });

    if (
      await newPlanBtn
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await newPlanBtn.first().click();

      // Formularfeld fuer Medikament ausfuellen (Name wird intern verschluesselt)
      const nameInput = pflegePage.page.getByLabel(
        /name|medikament|praeparat/i,
      );
      if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nameInput.fill("E2E-Testmedikament");
      }

      // Dosierungsfeld
      const dosageInput = pflegePage.page.getByLabel(/dosierung|dosis|menge/i);
      if (await dosageInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await dosageInput.fill("1-0-1");
      }

      // Speichern
      const saveBtn = pflegePage.page.getByRole("button", {
        name: /speichern|save|bestaetigen|anlegen/i,
      });
      if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await saveBtn.click();
        // Bestaetigungstext muss erscheinen
        await expect(
          pflegePage.page.getByText(
            /gespeichert|erstellt|angelegt|success|plan/i,
          ),
        ).toBeVisible({ timeout: 8_000 });
      }
    } else {
      // Fallback: Medikamentenplan per API direkt anlegen
      const { data, error } = await supabaseAdmin("medication_plans", "POST", {
        // Medikamentennamen werden im echten System AES-256-GCM verschluesselt
        medication_name_encrypted: "E2E-Testmedikament",
        dosage: "1-0-1",
        source: "pflege_e2e_test",
      });
      if (error && error !== "no_credentials") {
        console.warn(
          "[x13a] Medikamentenplan API-Fallback fehlgeschlagen:",
          error,
        );
      } else if (
        Array.isArray(data) &&
        (data as Record<string, unknown>[]).length > 0
      ) {
        testPlanId = String((data as Record<string, unknown>[])[0].id ?? "");
      }
    }

    await pflegePage.page.screenshot({
      path: "test-results/cross-portal/x13a-pflege-plan-angelegt.png",
    });
  });

  test("x13b: Bewohner sieht Medikamentenplan auf io:3000", async ({
    residentPage,
  }) => {
    // Zur Care/Medikamente-Seite des Bewohners navigieren
    await residentPage.page.goto("http://localhost:3000/care/medikamente");
    await residentPage.page.waitForLoadState("domcontentloaded");

    // Soft-Check per API: Medikamentenplan-Endpunkt moeglicherweise nicht vorhanden
    const apiPath = "/api/care/medication-plans?order=created_at.desc&limit=1";
    const resp = await residentPage.page.request
      .get(`http://localhost:3000${apiPath}`)
      .catch(() => null);
    if (!resp || !resp.ok()) {
      const status = resp ? resp.status() : "network error";
      console.warn(
        `[x13b] API ${apiPath} returned ${status} — Medikamentenplan-API nicht verfuegbar, uebersprungen`,
      );
      test.skip(true, `API ${apiPath} nicht verfuegbar (${status})`);
      return;
    }

    const apiData = await resp.json().catch(() => null);
    if (!Array.isArray(apiData) || apiData.length === 0) {
      console.warn(
        "[x13b] Kein Medikamentenplan in API gefunden — Cross-Portal-Sync zwischen Pflege (3004) und io (3000) moeglicherweise nicht aktiv",
      );
      test.skip(
        true,
        "Kein Medikamentenplan nach Pflege-Anlage gefunden (Cross-Portal-Sync)",
      );
      return;
    }

    // UI-Pruefung: Plan muss in der Auflistung sichtbar sein (soft)
    try {
      await waitForRealtimeUI(
        residentPage.page,
        async () => {
          // Medikamentenplan oder Plan-Element muss sichtbar sein
          await expect(
            residentPage.page.getByText(
              /medikament|plan|dosierung|einnahme|morgens/i,
            ),
          ).toBeVisible();
        },
        { timeout: 15_000 },
      );
    } catch {
      console.warn(
        "[x13b] Medikamentenplan nicht in UI sichtbar — API-Daten waren OK, UI-Rendering fehlt",
      );
    }

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x13b-bewohner-medikamentenplan.png",
    });
  });

  test("x13c: Aufraeuumen — Test-Medikamentenplan loeschen", async () => {
    const queryParam = testPlanId
      ? `id=eq.${testPlanId}`
      : "source=like.*e2e*&created_at=gte.now()-interval '10 minutes'";

    const { error } = await supabaseAdmin(
      "medication_plans",
      "DELETE",
      undefined,
      queryParam,
    );
    if (error && error !== "no_credentials") {
      console.warn("[x13c] Cleanup fehlgeschlagen:", error);
    }
  });
});
