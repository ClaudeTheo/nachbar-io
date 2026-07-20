import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExpertsPage from "@/app/(app)/experts/page";

const state = {
  selects: new Map<string, string>(),
};

const tableData: Record<string, unknown[]> = {
  skills: [
    {
      id: "skill-1",
      user_id: "expert-1",
      quarter_id: "quarter-1",
      category: "handwork",
      description: "Repariert kleine Haushaltsgeraete",
      is_public: true,
      created_at: "2026-07-20T12:00:00.000Z",
      user: {
        id: "expert-1",
        display_name: "Erika Expertin",
        avatar_url: null,
        trust_level: "verified",
        created_at: "2026-01-01T12:00:00.000Z",
      },
    },
  ],
  expert_reviews: [],
  expert_endorsements: [],
};

function buildChain(table: string) {
  const result = { data: tableData[table] ?? [], error: null };
  const chain: Record<string, unknown> & PromiseLike<typeof result> = {
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  chain.select = vi.fn((selection: string) => {
    state.selects.set(table, selection);
    return chain;
  });
  for (const method of ["eq", "order"]) {
    chain[method] = vi.fn(() => chain);
  }
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => buildChain(table),
  }),
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: { id: "quarter-1", name: "Testquartier" },
  }),
}));

describe("ExpertsPage public discovery", () => {
  beforeEach(() => {
    state.selects.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("zeigt einen unverbundenen Experten mit echtem Trust-Badge", async () => {
    render(<ExpertsPage />);

    expect(await screen.findByText("Erika Expertin")).toBeInTheDocument();
    expect(screen.getByText("Verifiziert")).toBeInTheDocument();
    await waitFor(() => {
      expect(state.selects.get("skills")).toContain(
        "user:users(id, display_name, avatar_url, trust_level, created_at)",
      );
    });
  });
});
