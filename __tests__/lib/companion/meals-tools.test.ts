import { describe, it, expect, vi, beforeEach } from "vitest";

// State
const state = {
  insertData: null as Record<string, unknown> | null,
  insertError: null as { message: string } | null,
  meals: [] as Record<string, unknown>[],
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      from: (table: string) => {
        if (table === "household_members") {
          return {
            select: () => ({
              eq: () => ({
                limit: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        household_id: "h-1",
                        household: { quarter_id: "q-1" },
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        if (table === "shared_meals") {
          return {
            insert: (data: Record<string, unknown>) => {
              state.insertData = data;
              return Promise.resolve({ error: state.insertError });
            },
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    order: () => ({
                      limit: () =>
                        Promise.resolve({ data: state.meals, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      },
    }),
}));

import { executeCompanionTool } from "@/modules/voice/services/tool-executor";
import { companionTools, WRITE_TOOLS } from "@/modules/voice/services/tools";

describe("Companion Meals Tools", () => {
  beforeEach(() => {
    state.insertData = null;
    state.insertError = null;
    state.meals = [];
  });

  describe("Tool-Definitionen", () => {
    it("create_meal ist definiert", () => {
      const tool = companionTools.find((t) => t.name === "create_meal");
      expect(tool).toBeTruthy();
      expect(tool!.input_schema.required).toContain("title");
      expect(tool!.input_schema.required).toContain("type");
      expect(tool!.input_schema.required).toContain("servings");
      expect(tool!.input_schema.required).toContain("meal_date");
    });

    it("list_meals ist definiert", () => {
      const tool = companionTools.find((t) => t.name === "list_meals");
      expect(tool).toBeTruthy();
    });

    it("create_meal ist ein Write-Tool", () => {
      expect(WRITE_TOOLS.has("create_meal")).toBe(true);
    });

    it("list_meals ist kein Write-Tool", () => {
      expect(WRITE_TOOLS.has("list_meals")).toBe(false);
    });
  });

  describe("create_meal Executor", () => {
    it("erstellt Portion erfolgreich", async () => {
      const result = await executeCompanionTool(
        "create_meal",
        {
          title: "Lasagne",
          type: "portion",
          servings: 3,
          meal_date: "2026-03-22",
        },
        "u-1",
      );

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Lasagne");
      expect(result.summary).toContain("3 Portionen");
      expect(state.insertData).toBeTruthy();
    });

    it("erstellt Einladung erfolgreich", async () => {
      const result = await executeCompanionTool(
        "create_meal",
        {
          title: "Grillabend",
          type: "invitation",
          servings: 6,
          meal_date: "2026-03-25",
          meal_time: "17:00",
        },
        "u-1",
      );

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Grillabend");
      expect(result.summary).toContain("6 Plaetze");
    });

    it("gibt Fehler bei DB-Fehler zurueck", async () => {
      state.insertError = { message: "DB-Fehler" };
      const result = await executeCompanionTool(
        "create_meal",
        {
          title: "Suppe",
          type: "portion",
          servings: 2,
          meal_date: "2026-03-22",
        },
        "u-1",
      );

      expect(result.success).toBe(false);
      expect(result.summary).toContain("Fehler");
    });
  });

  describe("list_meals Executor", () => {
    it("zeigt leere Liste", async () => {
      state.meals = [];
      const result = await executeCompanionTool("list_meals", {}, "u-1");

      expect(result.success).toBe(true);
      expect(result.summary).toContain("keine Mitess-Angebote");
    });

    it("listet vorhandene Angebote", async () => {
      state.meals = [
        {
          title: "Lasagne",
          type: "portion",
          servings: 3,
          meal_date: "2026-03-22",
          meal_time: "18:00",
          cost_hint: "2 EUR",
          user: { display_name: "Thomas" },
        },
        {
          title: "Grillabend",
          type: "invitation",
          servings: 6,
          meal_date: "2026-03-25",
          meal_time: null,
          cost_hint: null,
          user: { display_name: "Maria" },
        },
      ];
      const result = await executeCompanionTool("list_meals", {}, "u-1");

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Lasagne");
      expect(result.summary).toContain("Grillabend");
      expect(result.summary).toContain("3 Portionen");
      expect(result.summary).toContain("6 Plaetze");
    });
  });
});
