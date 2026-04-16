// X1: Bewohner Check-in -> Angehoeriger sieht Heartbeat- und Eskalationsstatus
// Flow:
// 1. Senior sendet Check-in "ok/good" -> Caregiver sieht "Alles gut" im Detail
// 2. Senior sendet Check-in "need_help" -> Caregiver sieht "Braucht Hilfe" + aktive SOS-Sicht
import { test, expect } from "../fixtures/roles";
import { gotoCare, waitForApiResult, waitForStableUI } from "../helpers/observer";
import { portalUrl } from "../helpers/portal-urls";
import { TIMEOUTS } from "../helpers/test-config";
import { supabaseAdmin } from "../helpers/supabase-admin";

test.describe("X1: Bewohner Check-in -> Angehoeriger Status", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(90_000);

  let residentId: string | null = null;
  let needHelpStartedAt: string | null = null;

  test("x1a: Bewohner macht Check-in (gut)", async ({ residentPage }) => {
    await gotoCare(residentPage.page, "/care/checkin");
    await expect(
      residentPage.page.getByRole("heading", {
        name: /Taeglicher Check-in/i,
      }),
    ).toBeVisible({ timeout: TIMEOUTS.pageLoad });

    const authCookie = (await residentPage.page.context().cookies()).find(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"),
    );
    if (authCookie?.value) {
      try {
        const raw = authCookie.value.startsWith("base64-")
          ? Buffer.from(
              authCookie.value.slice("base64-".length),
              "base64",
            ).toString("utf-8")
          : authCookie.value;
        residentId = JSON.parse(raw)?.user?.id ?? null;
      } catch {
        residentId = null;
      }
    }
    expect(residentId).toBeTruthy();

    const moodGood = residentPage.page.getByRole("button", {
      name: /Mir geht es gut/i,
    });
    await expect(moodGood).toBeVisible({ timeout: TIMEOUTS.pageLoad });

    const submitResponsePromise = residentPage.page.waitForResponse(
      (response) =>
        response.url().includes("/api/care/checkin") &&
        response.request().method() === "POST",
      { timeout: TIMEOUTS.pageLoad },
    );

    await moodGood.click();

    const submitResponse = await submitResponsePromise;
    expect(submitResponse.status()).toBe(201);
    const submittedCheckin = (await submitResponse.json()) as {
      id: string;
      status: string;
      mood: string | null;
    };
    expect(submittedCheckin.id).toBeTruthy();
    expect(submittedCheckin.status).toBe("ok");
    expect(submittedCheckin.mood).toBe("good");

    await expect(
      residentPage.page.getByText(/Ihr Check-in wurde gespeichert/i).first(),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    await expect
      .poll(
        async () => {
          const response = await residentPage.page.request.get(
            portalUrl("io", "/api/care/checkin?limit=5"),
          );
          if (!response.ok()) return null;
          const data = (await response.json()) as Array<{
            id?: string;
            status?: string;
            mood?: string | null;
            completed_at?: string | null;
          }>;
          const matchingCheckin = data.find(
            (entry) => entry.id === submittedCheckin.id,
          );
          if (!matchingCheckin) return null;
          return JSON.stringify({
            status: matchingCheckin.status ?? null,
            mood: matchingCheckin.mood ?? null,
            completed: Boolean(matchingCheckin.completed_at),
          });
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe(JSON.stringify({ status: "ok", mood: "good", completed: true }));

    await residentPage.page
      .screenshot({
        path: "test-results/cross-portal/x01a-checkin.png",
        timeout: 30_000,
      })
      .catch(() => {});
  });

  test("x1b: Angehoeriger sieht aktualisierten Heartbeat", async ({
    caregiverPage,
  }) => {
    expect(residentId).toBeTruthy();

    let statusData: {
      display_name?: string;
      last_checkin_status?: string | null;
      last_checkin_at?: string | null;
    } | null = null;

    await expect
      .poll(
        async () => {
          const response = await caregiverPage.page.request.get(
            portalUrl("io", `/api/resident/status?resident_id=${residentId}`),
          );
          if (!response.ok()) return null;
          statusData = await response.json();
          return statusData?.last_checkin_status ?? null;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe("ok");

    expect(statusData?.display_name).toBeTruthy();
    expect(statusData?.last_checkin_status).toBe("ok");
    expect(statusData?.last_checkin_at).toBeTruthy();

    await caregiverPage.page.goto(
      portalUrl("io", `/care/meine-senioren/${residentId}`),
    );
    await waitForStableUI(caregiverPage.page, { timeout: TIMEOUTS.pageLoad });

    await expect(
      caregiverPage.page.getByText(statusData!.display_name!).first(),
    ).toBeVisible({ timeout: TIMEOUTS.pageLoad });
    await expect(
      caregiverPage.page.getByText(/Aktivitaetsstatus/i).first(),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(
      caregiverPage.page.getByText(/Letzter Check-in/i).first(),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(
      caregiverPage.page.getByText(/Alles gut/i).first(),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    await caregiverPage.page.screenshot({
      path: "test-results/cross-portal/x01b-caregiver-status.png",
    });
  });

  test("x1c: Bewohner sendet need_help-Check-in", async ({ residentPage }) => {
    expect(residentId).toBeTruthy();
    needHelpStartedAt = new Date(Date.now() - 1_000).toISOString();

    const response = await residentPage.page.request.post(
      portalUrl("io", "/api/care/checkin"),
      {
        data: {
          status: "need_help",
          mood: "bad",
          note: "E2E-CROSS need_help",
        },
      },
    );

    expect(response.status()).toBe(201);
    const submittedCheckin = (await response.json()) as {
      id: string;
      status: string;
      mood: string | null;
    };

    expect(submittedCheckin.id).toBeTruthy();
    expect(submittedCheckin.status).toBe("need_help");
    expect(submittedCheckin.mood).toBe("bad");

    await waitForApiResult(
      residentPage.page,
      portalUrl("io", `/api/care/sos?senior_id=${residentId}`),
      (data) => Array.isArray(data) && data.length > 0,
      {
        timeout: 20_000,
        message: "Kein aktiver SOS-Alert nach need_help-Check-in gefunden",
      },
    );

    await residentPage.page.screenshot({
      path: "test-results/cross-portal/x01c-checkin-need-help.png",
    });
  });

  test("x1d: Angehoeriger sieht need_help inkl. SOS-Sicht", async ({
    caregiverPage,
  }) => {
    expect(residentId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const response = await caregiverPage.page.request.get(
            portalUrl("io", `/api/resident/status?resident_id=${residentId}`),
          );
          if (!response.ok()) return null;
          const data = (await response.json()) as {
            last_checkin_status?: string | null;
          };
          return data.last_checkin_status ?? null;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe("need_help");

    await waitForApiResult(
      caregiverPage.page,
      portalUrl("io", `/api/care/sos?senior_id=${residentId}`),
      (data) => Array.isArray(data) && data.length > 0,
      {
        timeout: 20_000,
        message: "Caregiver sieht keinen aktiven SOS-Alert",
      },
    );

    await caregiverPage.page.goto(
      portalUrl("io", `/care/meine-senioren/${residentId}`),
    );
    await waitForStableUI(caregiverPage.page, { timeout: TIMEOUTS.pageLoad });

    await expect(
      caregiverPage.page.getByTestId("care-last-checkin-status"),
    ).toContainText(/Braucht Hilfe/i);
    await expect(
      caregiverPage.page.getByTestId("care-escalation-banner"),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(
      caregiverPage.page.getByTestId("care-escalation-banner"),
    ).toContainText(/Aktive Hilfemeldung/i);

    await caregiverPage.page.getByTestId("care-sos-tab").click();
    await expect(
      caregiverPage.page.getByTestId("care-sos-item").first(),
    ).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(
      caregiverPage.page.getByTestId("care-sos-item").first(),
    ).toContainText(/Allgemeine Hilfe|Aktiv|Benachrichtigt|Hilfe zugesagt/i);

    await caregiverPage.page.screenshot({
      path: "test-results/cross-portal/x01d-caregiver-need-help.png",
    });
  });

  test("x1e: Aufraeumen des need_help-SOS", async () => {
    if (!residentId || !needHelpStartedAt) return;

    const { error } = await supabaseAdmin(
      "care_sos_alerts",
      "DELETE",
      undefined,
      `senior_id=eq.${residentId}&source=eq.checkin_timeout&created_at=gte.${encodeURIComponent(
        needHelpStartedAt,
      )}`,
    );

    if (error && error !== "no_credentials") {
      console.warn("[x1e] care_sos_alerts Cleanup:", error);
    }
  });
});
