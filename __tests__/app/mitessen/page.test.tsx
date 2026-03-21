import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import MitessenPage from "@/app/(app)/mitessen/page";

// Mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mutable state container
const state = {
  meals: [] as unknown[],
  quarterId: "q-1" as string | null,
};

// Generische Proxy-Chain: gibt am Ende immer { data, error: null } zurueck
function buildChain(data: unknown): Record<string, unknown> {
  const resolved = Promise.resolve({ data, error: null });
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const methods = ["select", "eq", "in", "gte", "order", "single", "limit", "neq"];
  for (const m of methods) {
    chain[m] = () => {
      // Jeder Aufruf gibt entweder die Chain oder das Promise zurueck
      // Wir geben ein Objekt zurueck das sowohl Chain-Methoden als auch thenable ist
      const nextChain = buildChain(data);
      // Mache es thenable damit await funktioniert
      (nextChain as Record<string, unknown>).then = (res: (v: unknown) => unknown) => resolved.then(res);
      return nextChain;
    };
  }
  // Auch direkt thenable machen
  (chain as Record<string, unknown>).then = (res: (v: unknown) => unknown) => resolved.then(res);
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "shared_meals") return buildChain(state.meals);
      return buildChain([]);
    },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u-1" } } }),
    },
  }),
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: state.quarterId ? { id: state.quarterId, name: "Test" } : null,
  }),
}));

// Test-Daten
const baseMeals = [
  {
    id: "meal-1",
    user_id: "u-1",
    quarter_id: "q-1",
    type: "portion",
    title: "Lasagne",
    description: "Selbstgemachte Lasagne",
    image_url: null,
    servings: 3,
    cost_hint: "2 EUR",
    pickup_info: "Purkersdorfer Str. 5",
    meal_date: "2026-03-21",
    meal_time: "18:00",
    expires_at: "2026-03-22T00:00:00Z",
    status: "active",
    created_at: new Date().toISOString(),
    user: { display_name: "Thomas", avatar_url: null },
    signup_count: 1,
    my_signup: null,
  },
  {
    id: "meal-2",
    user_id: "u-2",
    quarter_id: "q-1",
    type: "invitation",
    title: "Grillabend",
    description: "Gemeinsam grillen",
    image_url: null,
    servings: 6,
    cost_hint: null,
    pickup_info: null,
    meal_date: "2026-03-25",
    meal_time: "17:00",
    expires_at: null,
    status: "active",
    created_at: new Date().toISOString(),
    user: { display_name: "Maria", avatar_url: null },
    signup_count: 0,
    my_signup: null,
  },
];

describe("MitessenPage", () => {
  beforeEach(() => {
    cleanup();
    state.meals = [...baseMeals];
    state.quarterId = "q-1";
  });

  it("zeigt Überschrift und Anbieten-Button", () => {
    render(<MitessenPage />);
    expect(screen.getByText("Mitess-Plätze")).toBeInTheDocument();
    expect(screen.getByTestId("create-meal-button")).toBeInTheDocument();
  });

  it("zeigt Tabs nach dem Laden", async () => {
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-portions")).toBeInTheDocument();
    });
  });

  it("zeigt Portionen-Anzahl im Tab", async () => {
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-portions")).toHaveTextContent("Portionen (1)");
    });
  });

  it("zeigt Meal Cards mit Titel", async () => {
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByText("Lasagne")).toBeInTheDocument();
    });
  });

  it("zeigt Unkostenbeitrag", async () => {
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByText("2 EUR")).toBeInTheDocument();
    });
  });

  it("zeigt Abholinfo bei Portionen", async () => {
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByText("Purkersdorfer Str. 5")).toBeInTheDocument();
    });
  });

  it("zeigt Signup-Button", async () => {
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByText("Portion sichern")).toBeInTheDocument();
    });
  });

  it("zeigt leeren Zustand bei keinen Mahlzeiten", async () => {
    state.meals = [];
    render(<MitessenPage />);
    await waitFor(() => {
      expect(screen.getByText("Keine Portionen verfügbar.")).toBeInTheDocument();
    });
  });
});
