// Nachbar.io — Observer: Ueberwacht UI-Zustaende agentuebergreifend
import { Page, expect } from "@playwright/test";
import { TIMEOUTS } from "./test-config";

/**
 * Wartet bis die UI stabil ist (keine Netzwerk-Requests, keine Animationen).
 */
export async function waitForStableUI(
  page: Page,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.networkIdle;

  // Auf Netzwerk-Idle warten
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {
    // Fallback: Mindestens domcontentloaded
  });

  // Kurze Pause fuer Animationen/Transitions
  await page.waitForTimeout(TIMEOUTS.animationSettle);
}

/**
 * Navigiert zu einer Care-Seite und schliesst ggf. den AlarmScreen.
 * Der Alarm-Wecker blockiert sonst alle Care-Seiten mit einem Fullscreen-Overlay.
 */
export async function gotoCare(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForStableUI(page);

  // AlarmScreen abschalten falls aktiv (Vollbild-Overlay mit z-100).
  // WICHTIG: Nur den echten AlarmScreen erkennen (hat "Check-in Zeit" Text),
  // nicht beliebige "Aus"-Buttons auf der Zielseite.
  const alarmScreen = page.getByText("Check-in Zeit");
  if (await alarmScreen.isVisible({ timeout: 1500 }).catch(() => false)) {
    const ausButton = page.getByText("Aus", { exact: true });
    if (await ausButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await ausButton.click();
      await page.waitForTimeout(500);
    }
    // Nach Alarm-Abschaltung erneut navigieren
    await page.goto(path);
    await waitForStableUI(page);
  }
}

/**
 * Wartet auf eine Toast-Nachricht (sonner) mit bestimmtem Text.
 */
export async function waitForToast(
  page: Page,
  textPattern: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.toast;
  const toastLocator = page.locator("[data-sonner-toast]", {
    hasText:
      textPattern instanceof RegExp
        ? textPattern
        : new RegExp(textPattern, "i"),
  });
  await toastLocator.first().waitFor({ state: "visible", timeout });
}

/**
 * Prueft ob die Seite keine Konsolen-Fehler hat (ausser bekannte harmlose).
 */
export function createConsoleErrorCollector(page: Page): {
  errors: string[];
  stop: () => void;
} {
  const errors: string[] = [];

  // Bekannte harmlose Fehler ignorieren
  const IGNORED_PATTERNS = [
    /Download the React DevTools/,
    /Warning: ReactDOM/,
    /hydration/i,
    /NEXT_REDIRECT/,
    /AbortError/,
    /ResizeObserver loop/,
    /favicon\.ico/,
    /Failed to load resource.*40[0-9]/, // Supabase 4xx (406 Not Acceptable, 403 Forbidden)
    /the server responded with a status of 4/, // Generische 4xx Ressourcen-Fehler
    /Failed to fetch/, // Supabase Auth Token-Refresh bei Navigation (harmlos)
    /TypeError: Load failed/, // Webkit-Variante von Failed to fetch
  ];

  const handler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") {
      const text = msg.text();
      const isIgnored = IGNORED_PATTERNS.some((p) => p.test(text));
      if (!isIgnored) {
        errors.push(text);
      }
    }
  };

  page.on("console", handler);

  return {
    errors,
    stop: () => page.off("console", handler),
  };
}

/**
 * Ueberwacht den Unread-Counter in der BottomNav.
 */
export async function getUnreadCount(page: Page): Promise<number> {
  // Unread-Badge in der BottomNav (Inbox)
  const badge = page.locator(
    'nav[aria-label="Hauptnavigation"] .bg-emergency-red',
  );
  const isVisible = await badge.isVisible().catch(() => false);
  if (!isVisible) return 0;

  const text = await badge.textContent();
  if (!text) return 0;
  if (text === "9+") return 10;
  return parseInt(text, 10) || 0;
}

/**
 * Wartet darauf, dass ein Element im Feed erscheint.
 * Hilfreich fuer Realtime-Tests: Agent A postet, Agent B sieht es.
 */
export async function waitForFeedItem(
  page: Page,
  textPattern: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.realtimeDelivery;
  await page
    .locator(
      "[data-testid='feed-item'], [data-testid='help-card'], [data-testid='alert-card']",
      {
        hasText:
          textPattern instanceof RegExp
            ? textPattern
            : new RegExp(textPattern, "i"),
      },
    )
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Wartet auf eine Benachrichtigung im Inbox/Notifications-Panel.
 */
export async function waitForNotification(
  page: Page,
  textPattern: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.realtimeDelivery;

  // Erst zur Notifications-Seite navigieren
  await page.goto("/notifications");
  await waitForStableUI(page);

  // Auf Notification-Element warten
  await page
    .locator("[data-testid='notification-item']", {
      hasText:
        textPattern instanceof RegExp
          ? textPattern
          : new RegExp(textPattern, "i"),
    })
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Prueft die aktuelle Seiten-URL gegen ein Pattern.
 */
export async function assertCurrentRoute(
  page: Page,
  pattern: string | RegExp,
): Promise<void> {
  if (typeof pattern === "string") {
    await expect(page).toHaveURL(new RegExp(pattern));
  } else {
    await expect(page).toHaveURL(pattern);
  }
}

/**
 * Sammelt alle sichtbaren Fehler-Banner/Meldungen auf der Seite.
 */
export async function getVisibleErrors(page: Page): Promise<string[]> {
  const errorElements = page.locator(
    '[role="alert"], .text-emergency-red, .text-destructive',
  );
  const count = await errorElements.count();
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await errorElements.nth(i).textContent();
    if (text?.trim()) errors.push(text.trim());
  }

  return errors;
}

/**
 * Screenshot mit Agent-Prefix speichern.
 */
export async function takeAgentScreenshot(
  page: Page,
  agentPrefix: string,
  name: string,
): Promise<string> {
  const path = `test-results/screenshots/${agentPrefix}_${name}_${Date.now()}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

/**
 * Wartet darauf, dass ein Chat-Nachricht erscheint.
 */
export async function waitForChatMessage(
  page: Page,
  textPattern: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.realtimeDelivery;
  await page
    .locator("[data-testid='chat-message']", {
      hasText:
        textPattern instanceof RegExp
          ? textPattern
          : new RegExp(textPattern, "i"),
    })
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Zaehlt Chat-Nachrichten auf der aktuellen Seite.
 */
export async function getChatMessageCount(page: Page): Promise<number> {
  return page.locator("[data-testid='chat-message']").count();
}

/**
 * Wartet bis eine API-Abfrage das erwartete Ergebnis liefert (Polling).
 * Nutzt expect.poll() — ideal fuer Cross-Portal-Verifizierung.
 *
 * Beispiel: Nach SOS pruefen ob Eskalation in DB angekommen ist.
 */
export async function waitForApiResult(
  page: Page,
  apiPath: string,
  predicate: (data: unknown) => boolean,
  options?: { timeout?: number; intervals?: number[]; message?: string },
): Promise<unknown> {
  let lastData: unknown;
  await expect.poll(
    async () => {
      const resp = await page.request.get(apiPath);
      if (!resp.ok()) return false;
      lastData = await resp.json();
      return predicate(lastData);
    },
    {
      timeout: options?.timeout || 15_000,
      intervals: options?.intervals || [500, 1000, 2000, 3000],
      message: options?.message || `API ${apiPath} lieferte nicht das erwartete Ergebnis`,
    },
  ).toBeTruthy();
  return lastData;
}

/**
 * Wartet bis ein UI-Element den erwarteten Zustand hat (Realtime).
 * Nutzt expect().toPass() — ideal fuer Supabase Realtime Updates.
 *
 * Beispiel: Nach Check-in pruefen ob Angehoeriger Status-Update sieht.
 */
export async function waitForRealtimeUI(
  page: Page,
  assertion: () => Promise<void>,
  options?: { timeout?: number },
): Promise<void> {
  await expect(assertion).toPass({
    timeout: options?.timeout || 10_000,
  });
}

/**
 * Navigiert zu einer Cross-Portal-URL (absolute URL, nicht relativ).
 * Setzt localStorage-Flags fuer AlarmScreen/Onboarding.
 *
 * Beispiel: gotoCrossPortal(arztPage, 'http://localhost:3002/termine')
 */
export async function gotoCrossPortal(
  page: Page,
  absoluteUrl: string,
): Promise<void> {
  await page.goto(absoluteUrl);
  await page.evaluate(() => {
    localStorage.setItem('care_disclaimer_accepted', 'true');
    localStorage.setItem('e2e_disable_alarm', 'true');
    localStorage.setItem('e2e_skip_onboarding', 'true');
  });
  await waitForStableUI(page);
}
