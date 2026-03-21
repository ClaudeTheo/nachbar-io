import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HelpPage from "@/app/(app)/help/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => ({
    currentQuarter: { id: "q-1", name: "Test" },
  }),
}));

// Generische Proxy-Chain
function buildChain(data: unknown): Record<string, unknown> {
  const resolved = Promise.resolve({ data, error: null });
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const methods = ["select", "eq", "in", "gte", "order", "single", "limit", "neq"];
  for (const m of methods) {
    chain[m] = () => {
      const nextChain = buildChain(data);
      (nextChain as Record<string, unknown>).then = (res: (v: unknown) => unknown) => resolved.then(res);
      return nextChain;
    };
  }
  (chain as Record<string, unknown>).then = (res: (v: unknown) => unknown) => resolved.then(res);
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => buildChain([]),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u-1" } } }) },
  }),
}));

describe("HelpPage — Mitessen-Tab", () => {
  it("zeigt den Mitessen-Tab", async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-mitessen")).toBeInTheDocument();
    });
  });

  it("Tab enthält 'Mitessen' Text", async () => {
    render(<HelpPage />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-mitessen")).toHaveTextContent("Mitessen");
    });
  });
});
