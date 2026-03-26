// __tests__/api/cron/event-reminders.test.ts
// Tests fuer Event Push-Erinnerungen (24h + 1h vor Event)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockIn = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockNot = vi.fn();

const chainMethods = () => ({
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  gte: mockGte.mockReturnThis(),
  lte: mockLte.mockReturnThis(),
  in: mockIn.mockReturnThis(),
  not: mockNot.mockReturnThis(),
  insert: mockInsert.mockReturnValue({ error: null }),
  update: mockUpdate.mockReturnThis(),
});

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({
    from: mockFrom.mockImplementation(() => chainMethods()),
  })),
}));

vi.mock("@/lib/care/channels/push", () => ({
  sendPush: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/notifications-server", () => ({
  safeInsertNotification: vi
    .fn()
    .mockResolvedValue({ success: true, usedFallback: false }),
}));

import {
  shouldSendReminder,
  buildReminderMessage,
} from "@/lib/event-reminders";

describe("Event-Erinnerungen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findUpcomingEvents", () => {
    it("findet Events in den naechsten 24 Stunden", () => {
      const now = new Date("2026-03-20T10:00:00Z");
      const event = {
        id: "evt-1",
        title: "Nachbarschafts-Fruehstueck",
        event_date: "2026-03-21",
        event_time: "09:00",
        quarter_id: "q1",
      };

      // Event ist morgen 09:00 = 23h entfernt → innerhalb 24h
      const hoursUntil = getHoursUntilEvent(event, now);
      expect(hoursUntil).toBeLessThanOrEqual(24);
      expect(hoursUntil).toBeGreaterThan(0);
    });

    it("ignoriert Events die bereits vorbei sind", () => {
      const now = new Date("2026-03-20T10:00:00Z");
      const event = {
        id: "evt-2",
        title: "Vergangenes Event",
        event_date: "2026-03-19",
        event_time: "15:00",
        quarter_id: "q1",
      };

      const hoursUntil = getHoursUntilEvent(event, now);
      expect(hoursUntil).toBeLessThan(0);
    });
  });

  describe("shouldSendReminder", () => {
    it("sendet 24h-Erinnerung wenn Event in 22-24h ist", () => {
      expect(shouldSendReminder(23, "24h")).toBe(true);
      expect(shouldSendReminder(22.5, "24h")).toBe(true);
    });

    it("sendet KEINE 24h-Erinnerung wenn Event in 20h ist", () => {
      expect(shouldSendReminder(20, "24h")).toBe(false);
    });

    it("sendet 1h-Erinnerung wenn Event in 0.5-1h ist", () => {
      expect(shouldSendReminder(0.75, "1h")).toBe(true);
      expect(shouldSendReminder(0.5, "1h")).toBe(true);
    });

    it("sendet KEINE 1h-Erinnerung wenn Event in 2h ist", () => {
      expect(shouldSendReminder(2, "1h")).toBe(false);
    });

    it("sendet KEINE Erinnerung wenn Event bereits vorbei", () => {
      expect(shouldSendReminder(-1, "24h")).toBe(false);
      expect(shouldSendReminder(-0.5, "1h")).toBe(false);
    });
  });

  describe("buildReminderMessage", () => {
    it("erstellt 24h-Erinnerungs-Nachricht korrekt", () => {
      const msg = buildReminderMessage(
        "Nachbarschafts-Fruehstueck",
        "2026-03-21",
        "09:00",
        "24h",
      );
      expect(msg.title).toContain("Morgen");
      expect(msg.body).toContain("Nachbarschafts-Fruehstueck");
      expect(msg.body).toContain("09:00");
    });

    it("erstellt 1h-Erinnerungs-Nachricht korrekt", () => {
      const msg = buildReminderMessage(
        "Yoga im Park",
        "2026-03-20",
        "11:00",
        "1h",
      );
      expect(msg.title).toContain("In 1 Stunde");
      expect(msg.body).toContain("Yoga im Park");
    });
  });
});

// Hilfsfunktion fuer Tests — wird auch in lib/event-reminders.ts exportiert
function getHoursUntilEvent(
  event: { event_date: string; event_time: string },
  now: Date,
): number {
  const eventDateTime = new Date(`${event.event_date}T${event.event_time}:00`);
  return (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}
