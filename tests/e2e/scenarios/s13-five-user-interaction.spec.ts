// Nachbar.io - S13: 5-User-Interaktion fuer Live-/Pilot-Auswertung
// Fokus: isolierte Testnutzer, echte Sessions, Cross-User-Sichtbarkeit.
import { test, expect, type Page } from "@playwright/test";
import {
  createAgent,
  loginAgent,
  cleanupAgents,
  type TestAgent,
} from "../helpers/agent-factory";
import { waitForStableUI, waitForChatMessage } from "../helpers/observer";
import { supabaseAdmin, supabaseAuthAdmin } from "../helpers/supabase-admin";
import { TEST_AGENTS, TEST_MODE_HEADERS, TIMEOUTS } from "../helpers/test-config";

const RUN_ID = `E2E-FIVE-${Date.now()}`;

const USER_IDS = {
  anna: "nachbar_a",
  bernd: "helfer_b",
  senior: "senior_s",
  tanja: "betreuer_t",
  klara: "stadt_k",
} as const;

type UserKey = keyof typeof USER_IDS;

async function getUserIdByEmail(email: string): Promise<string> {
  const { data, error } = await supabaseAuthAdmin("users", "GET");
  if (error) throw new Error(`Auth user lookup failed for ${email}: ${error}`);
  const users = (data as { users?: Array<{ id?: string; email?: string }> })?.users ?? [];
  const id = users.find((user) => user.email === email)?.id;
  if (!id) throw new Error(`User not found for ${email}`);
  return id;
}

async function readProfile(userId: string, email: string) {
  const query = `id=eq.${userId}&select=id,display_name,role,ui_mode,trust_level,settings&limit=1`;
  const { data, error } = await supabaseAdmin("users", "GET", undefined, query);
  if (error) throw new Error(`Profile lookup failed for ${email}: ${error}`);
  const profile = (Array.isArray(data) ? data[0] : null) as {
    id: string;
    display_name: string;
    role: string;
    ui_mode: string;
    trust_level: string;
    settings?: { is_test_user?: boolean; test_user_kind?: string };
  } | null;
  return profile ? { ...profile, email } : null;
}

async function cleanupPair(userA: string, userB: string) {
  const existingConversations = await supabaseAdmin(
    "conversations",
    "GET",
    undefined,
    `or=(and(participant_1.eq.${userA},participant_2.eq.${userB}),and(participant_1.eq.${userB},participant_2.eq.${userA}))&select=id`,
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
    "contact_links",
    "DELETE",
    undefined,
    `or=(and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA}))`,
  );
  await supabaseAdmin(
    "neighbor_connections",
    "DELETE",
    undefined,
    `or=(and(requester_id.eq.${userA},target_id.eq.${userB}),and(requester_id.eq.${userB},target_id.eq.${userA}))`,
  );
}

function orderParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function createAcceptedConversation(userA: string, userB: string, note: string) {
  await supabaseAdmin("contact_links", "POST", {
    requester_id: userA,
    addressee_id: userB,
    status: "accepted",
    note,
    accepted_at: new Date().toISOString(),
  });

  const [participant1, participant2] = orderParticipants(userA, userB);
  const { data, error } = await supabaseAdmin("conversations", "POST", {
    participant_1: participant1,
    participant_2: participant2,
  });
  if (error) throw new Error(`Conversation setup failed: ${error}`);
  const conversation = Array.isArray(data) ? data[0] : null;
  const id = (conversation as { id?: string } | null)?.id;
  if (!id) throw new Error("Conversation setup returned no id");
  return id;
}

async function resolveOpenSosForSenior(seniorId: string) {
  await supabaseAdmin(
    "care_sos_alerts",
    "PATCH",
    {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: seniorId,
    },
    `senior_id=eq.${seniorId}&status=in.(triggered,notified,accepted,helper_enroute,escalated)`,
  );
}

async function acceptGuidelinesIfShown(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Community-Richtlinien" });
  if (!(await dialog.isVisible({ timeout: 3000 }).catch(() => false))) return;

  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: /Akzeptieren und fortfahren/i })
    .click();
  await expect(dialog).not.toBeVisible({ timeout: TIMEOUTS.elementVisible });
}

test.describe("S13: 5-User-Interaktion", () => {
  test.setTimeout(360_000);
  test.skip(
    !process.env.E2E_LIVE,
    "S13 prueft den Live-/Pilot-Flow gegen Cloud/Prod-Testdaten.",
  );

  let agents: Record<UserKey, TestAgent>;
  let userIds: Record<UserKey, string>;

  test.beforeEach(async ({ browser }) => {
    agents = {
      anna: await createAgent(browser, USER_IDS.anna),
      bernd: await createAgent(browser, USER_IDS.bernd),
      senior: await createAgent(browser, USER_IDS.senior, {
        viewport: { width: 393, height: 851 },
      }),
      tanja: await createAgent(browser, USER_IDS.tanja),
      klara: await createAgent(browser, USER_IDS.klara),
    };

    for (const agent of Object.values(agents)) {
      await loginAgent(agent);
    }

    userIds = {
      anna: agents.anna.userId ?? (await getUserIdByEmail(TEST_AGENTS.nachbar_a.email)),
      bernd: agents.bernd.userId ?? (await getUserIdByEmail(TEST_AGENTS.helfer_b.email)),
      senior: agents.senior.userId ?? (await getUserIdByEmail(TEST_AGENTS.senior_s.email)),
      tanja: agents.tanja.userId ?? (await getUserIdByEmail(TEST_AGENTS.betreuer_t.email)),
      klara: agents.klara.userId ?? (await getUserIdByEmail(TEST_AGENTS.stadt_k.email)),
    };

    await cleanupPair(userIds.anna, userIds.bernd);
    await resolveOpenSosForSenior(userIds.senior);
    await supabaseAdmin("care_helpers", "POST", {
      user_id: userIds.tanja,
      role: "relative",
      verification_status: "verified",
      assigned_seniors: [userIds.senior],
      skills: ["Rueckruf", "Alltagshilfe"],
      availability: { e2e: true, runId: RUN_ID },
    });
  });

  test.afterEach(async () => {
    await cleanupAgents(
      agents.anna,
      agents.bernd,
      agents.senior,
      agents.tanja,
      agents.klara,
    );
  });

  test("5 Nutzer sind sauber angelegt und interagieren ueber Board, Chat und Care", async ({}, testInfo) => {
    const profiles = await Promise.all(
      (Object.keys(USER_IDS) as UserKey[]).map((key) =>
        readProfile(userIds[key], TEST_AGENTS[USER_IDS[key]].email),
      ),
    );

    expect(profiles).toHaveLength(5);
    for (const profile of profiles) {
      expect(profile?.trust_level).toBe("verified");
      expect(profile?.settings?.is_test_user).toBe(true);
    }

    const caregiverLink = await supabaseAdmin(
      "caregiver_links",
      "GET",
      undefined,
      `resident_id=eq.${userIds.senior}&caregiver_id=eq.${userIds.tanja}&select=resident_id,caregiver_id,relationship_type,heartbeat_visible&limit=1`,
    );
    expect(Array.isArray(caregiverLink.data) ? caregiverLink.data.length : 0).toBe(1);

    const boardText = `${RUN_ID}: Anna teilt Quartier-Update fuer Klara`;
    await agents.anna.page.goto("/board");
    await waitForStableUI(agents.anna.page);
    await acceptGuidelinesIfShown(agents.anna.page);
    await agents.anna.page
      .getByPlaceholder("Was gibt es Neues im Quartier?")
      .fill(boardText);
    await agents.anna.page.getByRole("button", { name: "Posten" }).click();
    await expect(agents.anna.page.getByText(boardText)).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });

    await agents.klara.page.goto("/board");
    await waitForStableUI(agents.klara.page);
    await acceptGuidelinesIfShown(agents.klara.page);
    await expect(agents.klara.page.getByText(boardText)).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await agents.klara.page.screenshot({
      path: testInfo.outputPath("klara-sieht-board.png"),
      fullPage: false,
    });

    const requestMessage = `${RUN_ID}: Anna fragt Bernd nach Hilfe beim Einkauf`;
    const replyMessage = `${RUN_ID}: Bernd bestaetigt Hilfe`;
    const followUpMessage = `${RUN_ID}: Anna bestaetigt Treffpunkt`;

    const conversationId = await createAcceptedConversation(
      userIds.anna,
      userIds.bernd,
      requestMessage,
    );

    await agents.bernd.page.goto(`/chat/${conversationId}`);
    await waitForStableUI(agents.bernd.page);
    await agents.bernd.page.locator("[data-testid='chat-input']").fill(replyMessage);
    await agents.bernd.page.locator("[data-testid='chat-send']").click();
    await waitForChatMessage(agents.bernd.page, replyMessage, {
      timeout: TIMEOUTS.elementVisible,
    });

    await agents.anna.page.goto("/chat");
    await waitForStableUI(agents.anna.page);
    const conversationCard = agents.anna.page
      .locator("[data-testid='conversation-card']")
      .filter({ hasText: /Bernd M\./i })
      .first();
    await conversationCard.waitFor({
      state: "visible",
      timeout: TIMEOUTS.elementVisible,
    });
    await agents.anna.page.goto(`/chat/${conversationId}`);
    await waitForStableUI(agents.anna.page, { timeout: TIMEOUTS.pageLoad });
    await waitForChatMessage(agents.anna.page, replyMessage, {
      timeout: TIMEOUTS.realtimeDelivery,
    });
    await agents.anna.page.locator("[data-testid='chat-input']").fill(followUpMessage);
    await agents.anna.page.locator("[data-testid='chat-send']").click();
    await agents.anna.page.screenshot({
      path: testInfo.outputPath("anna-chat-bernd.png"),
      fullPage: false,
    });

    await waitForChatMessage(agents.bernd.page, followUpMessage, {
      timeout: TIMEOUTS.realtimeDelivery,
    });

    const sosResponse = await agents.senior.page.request.post("/api/care/sos", {
      headers: TEST_MODE_HEADERS,
      data: {
        category: "general_help",
        source: "app",
        notes: `${RUN_ID}: Senior bittet Tanja um Rueckruf`,
      },
    });
    expect(sosResponse.status()).toBe(201);
    const sos = (await sosResponse.json()) as { id: string };

    await agents.tanja.page.goto("/care");
    await waitForStableUI(agents.tanja.page, { timeout: TIMEOUTS.pageLoad });
    await expect(
      agents.tanja.page.getByRole("heading", { name: /Mein Tag/i }),
    ).toBeVisible({ timeout: TIMEOUTS.pageLoad });
    await expect(agents.tanja.page.getByText(/Aktive Hilfeanfragen/i)).toBeVisible({
      timeout: TIMEOUTS.pageLoad,
    });
    await expect(agents.tanja.page.getByText(/Allgemeine Hilfe/i).first()).toBeVisible({
      timeout: TIMEOUTS.pageLoad,
    });
    await agents.tanja.page.screenshot({
      path: testInfo.outputPath("tanja-sieht-sos.png"),
      fullPage: false,
    });

    const acceptResponse = await agents.tanja.page.request.post(
      `/api/care/sos/${sos.id}/respond`,
      {
        headers: TEST_MODE_HEADERS,
        data: { response_type: "accepted", eta_minutes: 15 },
      },
    );
    expect([200, 201]).toContain(acceptResponse.status());

    const resolveResponse = await agents.tanja.page.request.patch(
      `/api/care/sos/${sos.id}`,
      {
        headers: TEST_MODE_HEADERS,
        data: { status: "resolved" },
      },
    );
    expect(resolveResponse.status()).toBe(200);

    await agents.tanja.page.reload();
    await waitForStableUI(agents.tanja.page);
    const careUiStillShowsResolvedAlert = await agents.tanja.page
      .getByText(/Aktive Hilfeanfragen/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (careUiStillShowsResolvedAlert) {
      await agents.tanja.page.screenshot({
        path: testInfo.outputPath("tanja-care-stale-after-resolve.png"),
        fullPage: false,
      });
    }

    const resolvedAlert = await supabaseAdmin(
      "care_sos_alerts",
      "GET",
      undefined,
      `id=eq.${sos.id}&select=id,status,accepted_by,resolved_by,resolved_at&limit=1`,
    );
    const resolvedRows = Array.isArray(resolvedAlert.data)
      ? resolvedAlert.data
      : [];
    expect((resolvedRows[0] as { status?: string } | undefined)?.status).toBe(
      "resolved",
    );

    const report = {
      runId: RUN_ID,
      users: profiles.map((profile) => ({
        email: profile?.email,
        displayName: profile?.display_name,
        role: profile?.role,
        uiMode: profile?.ui_mode,
        trustLevel: profile?.trust_level,
        isTestUser: profile?.settings?.is_test_user,
      })),
      interactions: {
        board: { author: "Anna T.", observer: "Klara S.", text: boardText },
        chat: {
          requester: "Anna T.",
          responder: "Bernd M.",
          setupNote: requestMessage,
          messages: [replyMessage, followUpMessage],
        },
        care: {
          senior: "Gertrude H.",
          caregiver: "Tanja P.",
          sosId: sos.id,
          finalStatus: "resolved",
          careUiStillShowsResolvedAlert,
        },
      },
    };

    await testInfo.attach("five-user-report", {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });
  });
});
