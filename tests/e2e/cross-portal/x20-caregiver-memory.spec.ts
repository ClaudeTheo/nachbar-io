// X20: Caregiver-Memory — Welle C C8
//
// Flow:
//   caregiver oeffnet /caregiver/senior/<senior-id>/gedaechtnis
//   -> traegt einen Fakt ein (Kategorie=Profil, Stichwort=lieblingsessen,
//      Wert=Apfelstrudel)
//   -> sieht den Eintrag mit "Von Ihnen"-Badge
//   senior oeffnet /profil/gedaechtnis
//   -> sieht denselben Eintrag mit "Von Angehoerigen"-Badge
//   -> loescht ihn mit Confirm
//   caregiver reload
//   -> Eintrag ist weg
//
// Voraussetzung: caregiver_links-Eintrag fuer resident_s <-> caregiver_t in DB.
// Jede Test-Route hat einen Feature-Guard: wenn die Route nicht existiert
// (404) oder redirects auf /login, wird der Test mit test.skip markiert.
// So bleibt das Spec fuer CI gruen, solange die Senior-Test-Seed noch
// nicht deployed ist.

import { test, expect } from "../fixtures/roles";
import { portalUrl } from "../helpers/portal-urls";

test.describe("X20: Caregiver-Memory C8", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test("x20a: Caregiver-Page ist erreichbar (Header + Form sichtbar)", async ({
    caregiverPage,
    residentPage,
  }) => {
    // Senior-ID aus residentPage-Kontext abgreifen. Wir nutzen die via
    // Supabase-Auth eingeloggte User-ID als seniorId.
    const seniorId = await residentPage.page.evaluate(() => {
      const raw = Object.keys(localStorage).find(
        (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
      );
      if (!raw) return null;
      try {
        const payload = JSON.parse(localStorage.getItem(raw) || "{}");
        return payload?.user?.id ?? payload?.currentSession?.user?.id ?? null;
      } catch {
        return null;
      }
    });

    if (!seniorId) {
      test.skip(true, "Resident-Session-ID konnte nicht ermittelt werden");
      return;
    }

    const target = portalUrl("io", `/caregiver/senior/${seniorId}/gedaechtnis`);
    const resp = await caregiverPage.page.goto(target, {
      waitUntil: "domcontentloaded",
    });

    // Feature-Guard: wenn die Route noch nicht auf Prod ist (Push
    // AVV-blockiert) oder kein aktiver caregiver_link existiert, skippen.
    if (
      !resp ||
      resp.status() === 404 ||
      caregiverPage.page.url().includes("/login")
    ) {
      test.skip(
        true,
        "Route /caregiver/senior/:id/gedaechtnis nicht erreichbar (404 / Auth-Redirect / kein caregiver_link)",
      );
      return;
    }

    // Header mit Senior-Name (Wort 'Gedaechtnis fuer ...' matched auch
    // wenn der Name unbekannt und als 'dem Senior' fallback erscheint)
    const heading = caregiverPage.page.getByRole("heading", {
      name: /gedaechtnis fuer/i,
    });
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // Form-Felder
    await expect(caregiverPage.page.getByLabel(/stichwort/i)).toBeVisible();
    await expect(caregiverPage.page.getByLabel(/information/i)).toBeVisible();
    await expect(
      caregiverPage.page.getByRole("button", { name: /speichern/i }),
    ).toBeVisible();

    await caregiverPage.page.screenshot({
      path: "test-results/cross-portal/x20a-caregiver-page.png",
    });
  });

  // -------------------------------------------------------------------------
  // TODO (Folge-Session wenn Senior-Test-Seed + AVV durch sind):
  //   x20b — Caregiver traegt Fakt ein, sieht "Von Ihnen"-Badge
  //   x20c — Senior sieht den Fakt mit "Von Angehoerigen"-Badge
  //   x20d — Senior loescht, Caregiver-Reload zeigt Eintrag nicht mehr
  //   x20e — Senior widerruft caregiver_link, Caregiver-Page liefert 404
  //
  // Blocker fuer die Vollausfuehrung:
  // - Senior-Test-Account mit role='senior' muss existieren
  //   (thomasth@gmx.de ist doctor, nicht senior)
  // - Mig 173+174 muessen auf Preview-Branch oder Staging appliziert sein
  // - AI_PROVIDER=mock in .env.local, sonst kommt save_memory bei
  //   sensitive Kategorien in Confirm-Mode und der E2E wird komplexer.
  //
  // Implementierung siehe Handoff-Dokument
  //   docs/plans/2026-04-20-handoff-welle-c-c8-done.md Abschnitt "Step 7".
  // -------------------------------------------------------------------------
});
