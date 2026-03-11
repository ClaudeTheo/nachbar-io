// Nachbar.io — Observer: Ueberwacht UI-Zustaende agentuebergreifend
import { Page, expect } from "@playwright/test";
import { TIMEOUTS } from "./test-config";

/**
 * Wartet bis die UI stabil ist (keine Netzwerk-Requests, keine Animationen).
 */
export async function waitForStableUI(page: Page, options?: { timeout?: number }): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.networkIdle;

  // Auf Netzwerk-Idle warten
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {
    // Fallback: Mindestens domcontentloaded
  });

  // Kurze Pause fuer Animationen/Transitions
  await page.waitForTimeout(TIMEOUTS.animationSettle);
}

/**
 * Wartet auf eine Toast-Nachricht (sonner) mit bestimmtem Text.
 */
export async function waitForToast(
  page: Page,
  textPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.toast;
  const toastLocator = page.locator("[data-sonner-toast]", {
    hasText: textPattern instanceof RegExp ? textPattern : new RegExp(textPattern, "i"),
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
  const badge = page.locator('nav[aria-label="Hauptnavigation"] .bg-emergency-red');
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
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.realtimeDelivery;
  await page
    .locator("[data-testid='feed-item'], [data-testid='help-card'], [data-testid='alert-card']", {
      hasText: textPattern instanceof RegExp ? textPattern : new RegExp(textPattern, "i"),
    })
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Wartet auf eine Benachrichtigung im Inbox/Notifications-Panel.
 */
export async function waitForNotification(
  page: Page,
  textPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.realtimeDelivery;

  // Erst zur Notifications-Seite navigieren
  await page.goto("/notifications");
  await waitForStableUI(page);

  // Auf Notification-Element warten
  await page
    .locator("[data-testid='notification-item']", {
      hasText: textPattern instanceof RegExp ? textPattern : new RegExp(textPattern, "i"),
    })
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Prueft die aktuelle Seiten-URL gegen ein Pattern.
 */
export async function assertCurrentRoute(
  page: Page,
  pattern: string | RegExp
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
  const errorElements = page.locator('[role="alert"], .text-emergency-red, .text-destructive');
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
  name: string
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
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || TIMEOUTS.realtimeDelivery;
  await page
    .locator("[data-testid='chat-message']", {
      hasText: textPattern instanceof RegExp ? textPattern : new RegExp(textPattern, "i"),
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
