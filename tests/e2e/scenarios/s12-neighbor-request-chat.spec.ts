// Nachbar.io — S12: Kontaktanfrage → Annahme → echter Chat
// Aktueller Produktpfad: Bewohner-Browser in /messages, nicht Hilfe-Boerse.
import { test, expect } from "@playwright/test";
import {
  createAgent,
  loginAgent,
  cleanupAgents,
  type TestAgent,
} from "../helpers/agent-factory";
import { hashHouseholdId, hashUserId } from "@/lib/quarter/resident-hash";
import { withAgent } from "../helpers/scenario-runner";
import {
  waitForStableUI,
  waitForChatMessage,
} from "../helpers/observer";
import { TEST_MODE_HEADERS, TIMEOUTS } from "../helpers/test-config";
import { supabaseAdmin } from "../helpers/supabase-admin";
import { TEST_HOUSEHOLDS } from "../helpers/test-config";

test.describe("S12: Kontaktanfrage -> Annahme -> Chat", () => {
  test.setTimeout(240_000);

  let agentA: TestAgent;
  let agentB: TestAgent;

  test.beforeEach(async ({ browser }) => {
    agentA = await createAgent(browser, "nachbar_a");
    agentB = await createAgent(browser, "helfer_b");

    await loginAgent(agentA);
    await loginAgent(agentB);
  });

  test.afterEach(async () => {
    await cleanupAgents(agentA, agentB);
  });

  test("S12.1 — Nachbar-Anfrage fuehrt nach Annahme in einen echten Chat", async () => {
    const requestMessage = `E2E Kontaktanfrage ${Date.now()}`;
    const replyMessage = `E2E Antwort ${Date.now()}`;
    const followUpMessage = `E2E Rueckfrage ${Date.now()}`;
    const userIdA = agentA.userId ?? null;
    const userIdB = agentB.userId ?? null;

    expect(userIdA).toBeTruthy();
    expect(userIdB).toBeTruthy();

    const existingConversations = await supabaseAdmin(
      "conversations",
      "GET",
      undefined,
      `or=(and(participant_1.eq.${userIdA},participant_2.eq.${userIdB}),and(participant_1.eq.${userIdB},participant_2.eq.${userIdA}))&select=id`,
    );

    const conversationIds = Array.isArray(existingConversations.data)
      ? existingConversations.data
          .map((row) => (row as { id?: string }).id)
          .filter((value): value is string => Boolean(value))
      : [];

    if (conversationIds.length > 0) {
      await supabaseAdmin(
        "direct_messages",
        "DELETE",
        undefined,
        `conversation_id=in.(${conversationIds.join(",")})`,
      );
      await supabaseAdmin(
        "conversations",
        "DELETE",
        undefined,
        `id=in.(${conversationIds.join(",")})`,
      );
    }

    await supabaseAdmin(
      "neighbor_connections",
      "DELETE",
      undefined,
      `or=(and(requester_id.eq.${userIdA},target_id.eq.${userIdB}),and(requester_id.eq.${userIdB},target_id.eq.${userIdA}))`,
    );

    await withAgent(agentA, "Kontaktanfrage senden", async ({ page }) => {
      await page.goto("/messages");
      await waitForStableUI(page);

      const requestResponse = await page.request.post(
        "/api/quarter/residents/request",
        {
          headers: TEST_MODE_HEADERS,
          data: {
            hashedId: hashUserId(userIdB),
            householdId: hashHouseholdId(TEST_HOUSEHOLDS[1].id),
            message: requestMessage,
          },
        },
      );
      expect(requestResponse.status()).toBe(201);
    });

    await withAgent(agentB, "Anfrage annehmen und antworten", async ({ page }) => {
      await page.goto("/messages");
      await waitForStableUI(page);

      const pendingCard = page
        .locator("div.rounded-lg")
        .filter({ hasText: requestMessage })
        .first();

      try {
        await pendingCard.waitFor({
          state: "visible",
          timeout: TIMEOUTS.realtimeDelivery,
        });
      } catch {
        await page.reload();
        await waitForStableUI(page);
        await pendingCard.waitFor({
          state: "visible",
          timeout: TIMEOUTS.elementVisible,
        });
      }

      await pendingCard.getByRole("button", { name: /Annehmen/i }).click();
      await page.waitForURL(/\/messages\/.+/, { timeout: TIMEOUTS.pageLoad });

      await expect(page.locator("[data-testid='chat-partner-name']")).toHaveText(
        /Anna T\./i,
      );

      await page.locator("[data-testid='chat-input']").fill(replyMessage);
      await page.locator("[data-testid='chat-send']").click();

      await expect(
        page.locator("[data-testid='chat-message']").filter({ hasText: replyMessage }).first(),
      ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    });

    await withAgent(agentA, "Antwort empfangen und zurueckschreiben", async ({ page }) => {
      await page.goto("/messages");
      await waitForStableUI(page);

      const conversationCard = page
        .locator("[data-testid='conversation-card']")
        .filter({ hasText: /Bernd M\./i })
        .first();
      await conversationCard.waitFor({ state: "visible", timeout: TIMEOUTS.elementVisible });
      await conversationCard.click();
      await page.waitForURL(/\/messages\/.+/, { timeout: TIMEOUTS.pageLoad });

      try {
        await waitForChatMessage(page, replyMessage, {
          timeout: TIMEOUTS.realtimeDelivery,
        });
      } catch {
        await page.reload();
        await waitForStableUI(page);
        await expect(
          page.locator("[data-testid='chat-message']").filter({ hasText: replyMessage }).first(),
        ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
      }

      await page.locator("[data-testid='chat-input']").fill(followUpMessage);
      await page.locator("[data-testid='chat-send']").click();
    });

    await withAgent(agentB, "Rueckfrage empfangen", async ({ page }) => {
      try {
        await waitForChatMessage(page, followUpMessage, {
          timeout: TIMEOUTS.realtimeDelivery,
        });
      } catch {
        await page.reload();
        await waitForStableUI(page);
        await expect(page.getByText(followUpMessage).first()).toBeVisible({
          timeout: TIMEOUTS.elementVisible,
        });
      }
    });
  });
});
