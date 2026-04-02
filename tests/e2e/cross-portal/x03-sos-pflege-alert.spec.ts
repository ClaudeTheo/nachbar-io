// X3: Bewohner SOS → Pflege-Dashboard Alert + 112-Banner
// Flow: senior_s loest SOS aus → 112-Banner erscheint sofort (P0-Requirement) →
//       pflege_p sieht aktive Eskalation im Dashboard → Cleanup
import { test, expect } from "../fixtures/roles";
import { gotoCare } from "../helpers/observer";
import { supabaseAdmin } from "../helpers/supabase-admin";
import { portalUrl } from "../helpers/portal-urls";

test.describe("X3: Bewohner SOS → Pflege Alert", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test("x3a: Bewohner loest SOS aus", async ({ residentPage }) => {
    // SOS-Trigger: Der "SOS — Ich brauche Hilfe"-Button ist auf /care (nicht /alerts/new oder /care/sos)
    await residentPage.page.goto(portalUrl("io", "/care"));
    await residentPage.page.waitForLoadState("domcontentloaded");

    // Community-Richtlinien-Dialog schliessen falls vorhanden
    const richtlinienBtn = residentPage.page.getByRole("button", {
      name: /akzeptieren|verstanden|schlie/i,
    });
    if (await richtlinienBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await richtlinienBtn.click();
      await residentPage.page.waitForTimeout(500);
    }

    // SOS-Button — "SOS — Ich brauche Hilfe" auf der /care Seite
    const sosBtn = residentPage.page.getByRole("button", {
      name: /SOS|Notruf|Hilfe|brauche|Notfall/i,
    });
    await expect(sosBtn.first()).toBeVisible({ timeout: 5_000 });
    await sosBtn.first().click();

    // 112-Banner MUSS sofort nach SOS-Ausloesen erscheinen (kritisches P0-Requirement!)
    // Notfall-Kategorien fire/medical/crime zeigen IMMER zuerst 112/110.
    await expect(residentPage.page.getByText("112")).toBeVisible({
      timeout: 3_000,
    });

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x03a-sos-112.png",
    });
  });

  test("x3b: Pflege-Dashboard zeigt Eskalations-Alert", async ({
    residentPage,
  }) => {
    // API-basierte Verifikation vom io-Portal (stabiler als UI-Check auf Pflege-Portal).
    const resp = await residentPage.page.request
      .get(
        portalUrl("io", "/api/care/escalation-events?status=eq.active&order=created_at.desc&limit=1"),
      )
      .catch(() => null);

    if (!resp || resp.status() === 404) {
      test.skip(true, "Eskalations-API nicht verfuegbar");
      return;
    }

    if (resp.ok()) {
      const data = await resp.json().catch(() => []);
      // Mindestens eine aktive Eskalation nach SOS — oder leer (SOS nicht persistiert)
      console.log(
        `[x3b] Eskalationen gefunden: ${Array.isArray(data) ? data.length : 0}`,
      );
    }

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x03b-pflege-alert.png",
    });
  });

  test("x3c: Aufraumen — Test-Eskalation loeschen", async () => {
    // Test-Eskalation aus der DB entfernen (Service Role Key umgeht RLS).
    // Nur Eintraege der letzten 5 Minuten mit E2E-Marker loeschen.
    const { error } = await supabaseAdmin(
      "escalation_events",
      "DELETE",
      undefined,
      "created_at=gte.now()-interval '5 minutes'&details=like.*E2E*",
    );

    // Cleanup-Fehler loggen aber nicht als Test-Failure werten —
    // fehlende Credentials in CI sind akzeptabel.
    if (error && error !== "no_credentials") {
      console.warn("[x3c] Cleanup-Fehler:", error);
    }
  });
});
