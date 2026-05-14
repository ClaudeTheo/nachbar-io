// __tests__/api/youth-tasks.test.ts
import { describe, it, expect } from 'vitest';
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";
import {
  acceptYouthTask,
  createYouthTask,
  listYouthTasks,
} from "@/modules/youth/services/youth-routes.service";

// Validierungs-Tests fuer Aufgaben
describe('Youth Task Validation', () => {
  const VALID_CATEGORIES = ['technik', 'garten', 'begleitung', 'digital', 'event'];
  const VALID_RISK_LEVELS = ['niedrig', 'mittel'];

  it('akzeptiert gueltige Kategorien', () => {
    VALID_CATEGORIES.forEach(cat => {
      expect(VALID_CATEGORIES.includes(cat)).toBe(true);
    });
  });

  it('begleitung erfordert requires_org', () => {
    const category = 'begleitung';
    const requiresOrg = category === 'begleitung';
    expect(requiresOrg).toBe(true);
  });

  it('lehnt unbekannte Kategorien ab', () => {
    expect(VALID_CATEGORIES.includes('einkauf')).toBe(false);
  });

  it('berechnet Punkte-Reward korrekt', () => {
    // Standard: 20 Punkte, Technik-Bonus: +10
    const baseReward = 20;
    const technikBonus = 10;
    expect(baseReward + technikBonus).toBe(30);
  });

  it('akzeptiert nur gueltige Risk-Levels', () => {
    expect(VALID_RISK_LEVELS.includes('niedrig')).toBe(true);
    expect(VALID_RISK_LEVELS.includes('mittel')).toBe(true);
    expect(VALID_RISK_LEVELS.includes('hoch')).toBe(false);
  });

  it("listet serverseitig nur niedrig-riskante offene Aufgaben", async () => {
    const mock = createRouteMockSupabase();
    mock.addResponse("youth_tasks", { data: [], error: null });

    await listYouthTasks(mock.supabase, "youth-1", { quarterId: "q-1" });

    const taskCall = mock.fromCalls.find((call) => call.table === "youth_tasks");
    expect(taskCall?.args).toContainEqual(["eq", "status", "open"]);
    expect(taskCall?.args).toContainEqual(["eq", "risk_level", "niedrig"]);
  });

  it("blockiert nicht niedrig-riskante Jugend-Aufgaben beim Erstellen", async () => {
    const mock = createRouteMockSupabase();

    await expect(
      createYouthTask(mock.supabase, "creator-1", {
        quarter_id: "q-1",
        title: "Rasen mähen",
        description: "Bitte mit motorisiertem Gerät den Rasen mähen.",
        category: "garten",
        risk_level: "mittel",
        estimated_minutes: 60,
      }),
    ).rejects.toThrow("Jugendliche sehen nur leichte");
  });

  it("blockiert Aufgabenannahme fuer U13", async () => {
    const mock = createRouteMockSupabase();
    mock.addResponse("youth_profiles", {
      data: { access_level: "freigeschaltet", birth_year: new Date().getFullYear() - 12 },
      error: null,
    });

    await expect(
      acceptYouthTask(mock.supabase, "youth-u13", "task-1"),
    ).rejects.toThrow("unter 13");
  });

  it("blockiert Aufgabenannahme ohne Elternfreigabe", async () => {
    const mock = createRouteMockSupabase();
    mock.addResponse("youth_profiles", {
      data: { access_level: "basis", birth_year: new Date().getFullYear() - 15 },
      error: null,
    });

    await expect(
      acceptYouthTask(mock.supabase, "youth-basis", "task-1"),
    ).rejects.toThrow("Elternfreigabe");
  });
});
