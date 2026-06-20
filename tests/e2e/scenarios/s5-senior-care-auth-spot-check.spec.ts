// Nachbar.io — authentifizierter lokaler Spot-Check fuer Senior/Care-Einstiege.
// Nutzt ausschliesslich synthetische E2E-Test-Auth aus auth-setup.ts.
import { test, expect } from "@playwright/test";
import { authFile } from "../helpers/auth-paths";
import { TIMEOUTS } from "../helpers/test-config";
import {
  createConsoleErrorCollector,
  waitForStableUI,
} from "../helpers/observer";

test.describe("S5: Authentifizierter Senior/Care-Spot-Check", () => {
  test.use({ storageState: authFile("senior_s") });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("care_disclaimer_accepted", "true");
      localStorage.setItem("e2e_disable_alarm", "true");
      localStorage.setItem("e2e_skip_onboarding", "true");
    });
  });

  test("senior_s erreicht /senior → /kreis-start, /care und /care/consent", async ({
    page,
  }) => {
    const errors = createConsoleErrorCollector(page);

    const seniorEntry = await page.goto("/senior", {
      waitUntil: "domcontentloaded",
    });
    expect(seniorEntry?.status() ?? 0).toBeLessThan(500);
    await expect(page).toHaveURL(/\/kreis-start/);
    await expect(page.getByTestId("kreis-start-tile")).toHaveCount(4, {
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(page.getByText("Notfall 112")).toBeVisible();

    const seniorHome = await page.goto("/kreis-start", {
      waitUntil: "domcontentloaded",
    });
    expect(seniorHome?.status() ?? 0).toBeLessThan(500);
    await expect(page).toHaveURL(/\/kreis-start/);
    await expect(page.getByTestId("kreis-start-tile")).toHaveCount(4);

    const care = await page.goto("/care", { waitUntil: "domcontentloaded" });
    expect(care?.status() ?? 0).toBeLessThan(500);
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/care$/);
    await expect(
      page.getByRole("heading", { name: /Mein Tag|Gesundheit/i }),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText("Check-in", { exact: true })).toBeVisible();

    const consent = await page.goto("/care/consent", {
      waitUntil: "domcontentloaded",
    });
    expect(consent?.status() ?? 0).toBeLessThan(500);
    await waitForStableUI(page);
    await expect(page).toHaveURL(/\/care\/consent$/);
    await expect(
      page.getByRole("heading", { name: /Datenschutz-Einwilligungen/i }),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(
      page.getByText(/Gesundheitsdaten \(Art\. 9 DSGVO\)/i),
    ).toBeVisible();

    errors.stop();
    expect(errors.errors).toHaveLength(0);
  });
});
