// X19: OZG-Civic Postfach — Buerger-UI + Civic-Antwortpfad
//
// Verifiziert den echten lokalen Produktpfad:
// 1. Buerger sendet ueber /postfach/neu
// 2. Thread landet korrekt im kanonischen Civic-Datenmodell
// 3. Rathaus-Antwort wird lokal ueber das Civic-Modell simuliert
// 4. Buerger sieht Unread + Thread-Detail, das Oeffnen markiert als gelesen
// 5. Buerger antwortet im echten Thread
// 6. Civic-Thread-Modell zeigt Reply-Count + awaiting_reply wieder auf true
import { test, expect } from "../fixtures/roles";
import { waitForRealtimeUI, waitForStableUI } from "../helpers/observer";
import { portalUrl } from "../helpers/portal-urls";
import { supabaseAdmin } from "../helpers/supabase-admin";
import { encryptCivicField } from "../../../lib/civic/encryption";

const TEST_MARKER = `E2E-Postfach-${Date.now()}`;
const TEST_SUBJECT = `${TEST_MARKER} Gehweg kaputt`;
const TEST_BODY_CITIZEN =
  "Der Gehweg in der E2E-Teststrasse hat mehrere Stolperstellen. Bitte pruefen Sie die Stelle zeitnah.";
const TEST_BODY_STAFF =
  "Vielen Dank fuer Ihre Meldung. Der Bauhof wurde informiert und plant die Reparatur fuer kommende Woche ein.";
const TEST_BODY_CITIZEN_REPLY =
  "Vielen Dank fuer die schnelle Rueckmeldung. Ich gebe den Hinweis an die Nachbarschaft weiter.";

type CivicMessageRecord = {
  id: string;
  org_id: string;
  citizen_user_id: string;
  subject: string;
  thread_id: string;
  direction: "citizen_to_staff" | "staff_to_citizen";
  status: string | null;
  created_at: string;
  sender_user_id: string | null;
  citizen_read_until?: string | null;
};

async function fillPostfachComposer(
  page: import("@playwright/test").Page,
  subject: string,
  body: string,
) {
  const subjectInput = page.getByTestId("postfach-subject-input");
  const bodyInput = page.getByTestId("postfach-body-input");
  const sendButton = page.getByTestId("postfach-send-button");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await expect(subjectInput).toBeVisible({ timeout: 30_000 });
    await expect(bodyInput).toBeVisible({ timeout: 30_000 });

    await subjectInput.fill(subject);
    await bodyInput.fill(body);
    await expect(subjectInput).toHaveValue(subject);
    await expect(bodyInput).toHaveValue(body);
    await page.waitForTimeout(300);

    if (await sendButton.isEnabled()) {
      return;
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForStableUI(page, { timeout: 30_000 });
  }

  await expect(sendButton).toBeEnabled();
}

async function fillPostfachReply(
  page: import("@playwright/test").Page,
  body: string,
) {
  const replyInput = page.getByTestId("postfach-reply-input");
  const replyButton = page.getByTestId("postfach-reply-send-button");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await expect(replyInput).toBeVisible({ timeout: 30_000 });
    await replyInput.fill(body);
    await expect(replyInput).toHaveValue(body);
    await page.waitForTimeout(300);

    if (await replyButton.isEnabled()) {
      return;
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForStableUI(page, { timeout: 30_000 });
  }

  await expect(replyButton).toBeEnabled();
}

async function gotoThreadDetail(
  page: import("@playwright/test").Page,
  threadId: string,
) {
  const url = portalUrl("io", `/postfach/${threadId}`);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await waitForStableUI(page, { timeout: 30_000 });
      if (page.url().endsWith(`/postfach/${threadId}`)) {
        return;
      }
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }

  await expect(page).toHaveURL(new RegExp(`/postfach/${threadId}$`), {
    timeout: 30_000,
  });
}

async function fetchThreadMessages(threadId: string): Promise<CivicMessageRecord[]> {
  const { data, error } = await supabaseAdmin(
    "civic_messages",
    "GET",
    undefined,
    `select=id,org_id,citizen_user_id,subject,thread_id,direction,status,created_at,sender_user_id,citizen_read_until&thread_id=eq.${threadId}&order=created_at.asc`,
  );

  expect(error).toBeNull();
  return (data as CivicMessageRecord[]) ?? [];
}

function summarizeCivicThread(messages: CivicMessageRecord[]) {
  const root = messages.find((message) => message.thread_id === message.id) ?? null;
  const replies = messages.filter((message) => !root || message.id !== root.id);
  const hasStaffReply = replies.some(
    (message) => message.direction === "staff_to_citizen",
  );
  const lastReply = replies.at(-1) ?? null;

  return {
    replyCount: replies.length,
    awaitingReply:
      hasStaffReply && lastReply?.direction === "citizen_to_staff",
  };
}

async function cleanupExistingE2eThreads() {
  const { error } = await supabaseAdmin(
    "civic_messages",
    "DELETE",
    undefined,
    `subject=like.${encodeURIComponent("E2E-Postfach-*")}`,
  );

  if (error && error !== "no_credentials") {
    expect(error).toBeNull();
  }
}

async function insertStaffReply(threadId: string, body: string): Promise<string> {
  const messages = await fetchThreadMessages(threadId);
  const root = messages.find((message) => message.id === threadId) ?? null;

  expect(root).toBeTruthy();

  const replyId = crypto.randomUUID();

  const { error } = await supabaseAdmin("civic_messages", "POST", {
    id: replyId,
    org_id: root!.org_id,
    citizen_user_id: root!.citizen_user_id,
    subject: root!.subject,
    body_encrypted: encryptCivicField(body),
    thread_id: root!.id,
    direction: "staff_to_citizen",
    sender_user_id: root!.citizen_user_id,
    status: "sent",
  });

  expect(error).toBeNull();
  return replyId;
}

test.describe("X19: OZG-Civic Postfach — Buerger↔Rathaus Thread", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  let threadId: string | null = null;

  test.afterAll(async () => {
    if (!threadId) return;

    const { error } = await supabaseAdmin(
      "civic_messages",
      "DELETE",
      undefined,
      `thread_id=eq.${threadId}`,
    );

    if (error && error !== "no_credentials") {
      console.warn("[x19] civic_messages Cleanup:", error);
    }
  });

  test("x19a: Buerger sendet ueber /postfach/neu", async ({ residentPage }) => {
    await cleanupExistingE2eThreads();

    await residentPage.page.goto(portalUrl("io", "/postfach/neu"));
    await waitForStableUI(residentPage.page);

    await fillPostfachComposer(
      residentPage.page,
      TEST_SUBJECT,
      TEST_BODY_CITIZEN,
    );

    const sendResponsePromise = residentPage.page.waitForResponse(
      (response) =>
        response.url().includes("/api/postfach") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await residentPage.page.getByTestId("postfach-send-button").click();
    const sendResponse = await sendResponsePromise;
    const sendResponseText = await sendResponse.text();

    expect(
      {
        status: sendResponse.status(),
        body: sendResponseText,
      },
      "POST /api/postfach sollte 201 liefern",
    ).toMatchObject({ status: 201 });

    await expect(
      residentPage.page.getByTestId("postfach-send-success"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      residentPage.page.getByTestId("postfach-send-success"),
    ).toContainText(/gesendet/i);

    let threadsData: Array<{
      id: string;
      subject: string;
      unread_count: number;
    }> = [];

    await expect
      .poll(
        async () => {
          const response = await residentPage.page.request.get(
            portalUrl("io", "/api/postfach"),
          );
          if (!response.ok()) return null;
          threadsData = await response.json();
          const thread = threadsData.find((entry) => entry.subject === TEST_SUBJECT);
          threadId = thread?.id ?? null;
          return threadId;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .not.toBeNull();

    await residentPage.page.goto(portalUrl("io", "/postfach"));
    await waitForStableUI(residentPage.page);

    await expect(
      residentPage.page
        .getByTestId("postfach-thread-card")
        .filter({ hasText: TEST_SUBJECT })
        .first(),
    ).toBeVisible();

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x19a-citizen-send.png",
    });
  });

  test("x19b: Thread ist im Civic-Datenmodell korrekt angelegt", async () => {
    expect(threadId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const messages = await fetchThreadMessages(threadId!);
          const root = messages.find((message) => message.id === threadId) ?? null;
          return root?.id ?? null;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(threadId);

    const messages = await fetchThreadMessages(threadId!);
    const root = messages.find((message) => message.id === threadId) ?? null;
    const summary = summarizeCivicThread(messages);

    expect(root?.subject).toBe(TEST_SUBJECT);
    expect(root?.direction).toBe("citizen_to_staff");
    expect(root?.org_id).toBeTruthy();
    expect(root?.citizen_user_id).toBeTruthy();
    expect(summary).toEqual({ replyCount: 0, awaitingReply: false });
  });

  test("x19c: Rathaus-Antwort wird im lokalen Civic-Modell angelegt", async () => {
    expect(threadId).toBeTruthy();

    const replyId = await insertStaffReply(threadId!, TEST_BODY_STAFF);

    await expect
      .poll(
        async () => {
          const messages = await fetchThreadMessages(threadId!);
          return messages.length;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(2);

    const messages = await fetchThreadMessages(threadId!);
    const reply = messages.find((message) => message.id === replyId) ?? null;
    const summary = summarizeCivicThread(messages);

    expect(reply?.direction).toBe("staff_to_citizen");
    expect(summary).toEqual({ replyCount: 1, awaitingReply: false });
  });

  test("x19d: Buerger sieht Antwort und Oeffnen markiert als gelesen", async ({
    residentPage,
  }) => {
    expect(threadId).toBeTruthy();

    await residentPage.page.goto(portalUrl("io", "/postfach"));

    await waitForRealtimeUI(
      residentPage.page,
      async () => {
        const threadCard = residentPage.page
          .getByTestId("postfach-thread-card")
          .filter({ hasText: TEST_SUBJECT })
          .first();

        await expect(threadCard).toBeVisible();
        await expect(
          threadCard.getByTestId("postfach-unread-badge"),
        ).toContainText(/neue Antwort/i);
      },
      { timeout: 20_000 },
    );

    await gotoThreadDetail(residentPage.page, threadId!);

    await expect(
      residentPage.page.getByText(TEST_BODY_STAFF),
    ).toBeVisible({ timeout: 20_000 });

    await expect
      .poll(
        async () => {
          const response = await residentPage.page.request.get(
            portalUrl("io", "/api/postfach"),
          );
          if (!response.ok()) return null;
          const threads = (await response.json()) as Array<{
            id: string;
            unread_count: number;
          }>;
          return threads.find((entry) => entry.id === threadId)?.unread_count ?? null;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(0);

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x19d-citizen-read.png",
    });
  });

  test("x19e: Buerger antwortet im Thread und Civic-Modell zeigt awaiting_reply", async ({
    residentPage,
  }) => {
    expect(threadId).toBeTruthy();

    await gotoThreadDetail(residentPage.page, threadId!);

    await fillPostfachReply(
      residentPage.page,
      TEST_BODY_CITIZEN_REPLY,
    );

    const replyResponsePromise = residentPage.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/postfach/${threadId}/antwort`) &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await residentPage.page.getByTestId("postfach-reply-send-button").click();
    const replyResponse = await replyResponsePromise;
    const replyResponseText = await replyResponse.text();

    expect(
      {
        status: replyResponse.status(),
        body: replyResponseText,
      },
      "POST /api/postfach/[id]/antwort sollte 201 liefern",
    ).toMatchObject({ status: 201 });

    await expect(
      residentPage.page.getByTestId("postfach-reply-success"),
    ).toBeVisible({ timeout: 30_000 });

    let residentDetail: {
      messages: Array<{
        direction: string;
        body: string;
      }>;
    } | null = null;

    await expect
      .poll(
        async () => {
          const detailResponse = await residentPage.page.request.get(
            portalUrl("io", `/api/postfach/${threadId}`),
          );
          if (!detailResponse.ok()) return 0;
          residentDetail = await detailResponse.json();
          return residentDetail?.messages?.length ?? 0;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(3);

    expect(residentDetail?.messages[2]?.direction).toBe("citizen_to_staff");
    expect(residentDetail?.messages[2]?.body).toContain("Vielen Dank");

    await expect
      .poll(
        async () => {
          const messages = await fetchThreadMessages(threadId!);
          return JSON.stringify(summarizeCivicThread(messages));
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(JSON.stringify({ replyCount: 2, awaitingReply: true }));

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x19e-citizen-reply.png",
    });
  });
});
