// Nachbar.io — axe-core Smoke (oeffentliche Seiten, kein Auth noetig)
// Faengt WCAG 2.1 AA Regressionen auf Landing, Login, Register ab.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PAGES = ["/", "/login", "/register"];

for (const path of PUBLIC_PAGES) {
  test(`axe WCAG 2.1 AA: ${path}`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(path, { waitUntil: "networkidle", timeout: 15000 });
    // Warte bis Seite stabil (kein Redirect)
    await page.waitForLoadState("domcontentloaded");

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const critical = violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    if (critical.length > 0) {
      const summary = critical
        .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}x)`)
        .join("\n");
      console.log(`WCAG violations on ${path}:\n${summary}`);
    }

    expect(critical).toHaveLength(0);
    await ctx.close();
  });
}
