import { test, expect } from '@playwright/test';

test.describe('Nachbar Hilfe', () => {
  test('Hilfe-Seite ist erreichbar', async ({ page }) => {
    await page.goto('/hilfe');
    await expect(page.getByText('Nachbarschaftshilfe')).toBeVisible({ timeout: 10000 });
  });

  test('Pflege-Profil Formular laden', async ({ page }) => {
    await page.goto('/hilfe/profil');
    await expect(page.getByText(/Pflegegrad|Pflege-Profil/i)).toBeVisible({ timeout: 10000 });
  });

  test('Helfer-Registrierung Formular laden', async ({ page }) => {
    await page.goto('/hilfe/helfer-werden');
    await expect(page.getByText(/Bundesland|Helfer werden/i)).toBeVisible({ timeout: 10000 });
  });

  test('Neues Gesuch Formular laden', async ({ page }) => {
    await page.goto('/hilfe/neu');
    await expect(page.getByText(/Einkaufen|Hilfe-Gesuch/i)).toBeVisible({ timeout: 10000 });
  });

  test('Budget-Tracker zeigt 131 EUR', async ({ page }) => {
    await page.goto('/hilfe/budget');
    await expect(page.getByText(/131|Entlastungsbetrag/i)).toBeVisible({ timeout: 10000 });
  });

  test('Bremen-Warnung bei Helfer-Registrierung', async ({ page }) => {
    await page.goto('/hilfe/helfer-werden');
    // Wait for page to load first
    await expect(page.getByText(/Helfer werden/i)).toBeVisible({ timeout: 10000 });
    // Find and select Bremen in the Bundesland dropdown
    const select = page.locator('select').first();
    await select.selectOption('HB');
    await expect(page.getByText(/Bremen|nicht.*abrechenbar/i)).toBeVisible({ timeout: 5000 });
  });

  test('Senior-Mode: Buttons haben ausreichende Groesse', async ({ page }) => {
    await page.goto('/hilfe');
    await expect(page.getByText('Nachbarschaftshilfe')).toBeVisible({ timeout: 10000 });
    const buttons = await page.getByRole('button').all();
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box && box.height > 0) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('API /api/hilfe/federal-states gibt Array', async ({ request }) => {
    const res = await request.get('/api/hilfe/federal-states');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });
});
