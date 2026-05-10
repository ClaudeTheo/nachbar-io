import { describe, expect, it } from "vitest";
import {
  isClosedPilotPublicApiPath,
  isClosedPilotPublicPath,
} from "@/lib/closed-pilot";

describe("closed pilot public paths", () => {
  it("keeps the Open Graph image route public", () => {
    expect(isClosedPilotPublicPath("/opengraph-image")).toBe(true);
  });

  it.each(["/login", "/register", "/auth/callback", "/freigabe-ausstehend"])(
    "keeps auth and approval route %s public",
    (path) => {
      expect(isClosedPilotPublicPath(path)).toBe(true);
    },
  );

  it("keeps registration APIs public for pending onboarding", () => {
    expect(isClosedPilotPublicApiPath("/api/register/check-invite")).toBe(true);
    expect(isClosedPilotPublicApiPath("/api/register/complete")).toBe(true);
    expect(isClosedPilotPublicApiPath("/api/messages")).toBe(false);
  });

  it("keeps the AI-test cleanup dry-run cron endpoint reachable in closed pilot", () => {
    expect(
      isClosedPilotPublicApiPath("/api/cron/ai-test-cleanup-dry-run"),
    ).toBe(true);
  });

  // Welle "Closed-Pilot-Cron-Fix": alle Vercel-Crons muessen erreichbar bleiben,
  // sonst stoppen Heartbeat/Sync/Reminder-Jobs. Auth weiterhin via CRON_SECRET.
  it.each([
    "/api/cron/escalation",
    "/api/cron/digest",
    "/api/cron/dormancy",
    "/api/cron/onboarding",
    "/api/cron/heartbeat-cleanup",
    "/api/cron/subscription-check",
    "/api/cron/analytics",
    "/api/cron/welcome",
    "/api/cron/event-reminders",
    "/api/cron/recurring-events",
    "/api/cron/waste-reminder",
    "/api/cron/waste-sync",
    "/api/cron/amtsblatt-sync",
    "/api/cron/hilfe-reminder",
    "/api/cron/quartier-info-sync",
    "/api/cron/osm-poi-sync",
    "/api/cron/quartier-events-sync",
    "/api/cron/nina-sync",
    "/api/cron/forensic-cleanup",
    "/api/cron/synthetic-smoke",
    "/api/cron/expire-invitations",
    "/api/care/cron/escalation",
    "/api/care/cron/checkin",
    "/api/care/cron/medications",
    "/api/care/cron/appointments",
    "/api/care/cron/shopping",
    "/api/care/cron/tasks",
    "/api/care/cron/heartbeat-escalation",
  ])("whitelists Vercel cron route %s in closed pilot", (path) => {
    expect(isClosedPilotPublicApiPath(path)).toBe(true);
  });

  it("keeps the news cron endpoints reachable in closed pilot", () => {
    expect(isClosedPilotPublicApiPath("/api/news/scrape")).toBe(true);
    expect(isClosedPilotPublicApiPath("/api/news/rss")).toBe(true);
  });

  it("does NOT whitelist non-cron API paths via cron-pattern", () => {
    expect(isClosedPilotPublicApiPath("/api/messages")).toBe(false);
    expect(isClosedPilotPublicApiPath("/api/admin/stats")).toBe(false);
    expect(isClosedPilotPublicApiPath("/api/care/sos")).toBe(false);
  });
});
