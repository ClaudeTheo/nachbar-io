import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getCachedUser: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: mocks.getCachedUser,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: mocks.toastError,
    success: vi.fn(),
  }),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SheetHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

function fluentResult(data: unknown) {
  const result = { data, error: null };
  const chain: Record<string, unknown> & PromiseLike<typeof result> = {
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "eq", "not", "in", "lte", "gte", "or"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function createSupabase(options: {
  members: unknown[];
  vacations?: unknown[];
}) {
  const from = vi.fn((table: string) => {
    if (table === "households") return fluentResult({ id: "house-foreign" });
    if (table === "household_members") return fluentResult(options.members);
    if (table === "neighbor_connections") return fluentResult([]);
    if (table === "vacation_modes") return fluentResult(options.vacations ?? []);
    return fluentResult([]);
  });
  return { from };
}

import { HouseInfoPanel } from "@/components/HouseInfoPanel";

describe("HouseInfoPanel privacy empty states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedUser.mockResolvedValue({ user: { id: "user-own" } });
  });

  it("rendert bei leer gefilterten Fremdmitgliedern einen stabilen Empty-State", async () => {
    mocks.createClient.mockReturnValue(createSupabase({ members: [] }));

    render(
      <HouseInfoPanel
        open
        onOpenChange={vi.fn()}
        streetCode="PS"
        houseNumber="7"
      />,
    );

    expect(
      await screen.findByText("Noch keine Bewohner registriert"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(screen.queryByText(/Im Urlaub bis/)).not.toBeInTheDocument();
  });

  it("rendert einen erlaubten Bewohner auch ohne sichtbare Urlaubsdaten", async () => {
    mocks.createClient.mockReturnValue(
      createSupabase({
        members: [
          {
            user_id: "user-own",
            users: {
              id: "user-own",
              display_name: "Eigene Person",
              avatar_url: null,
            },
          },
        ],
        vacations: [],
      }),
    );

    render(
      <HouseInfoPanel
        open
        onOpenChange={vi.fn()}
        streetCode="PS"
        houseNumber="7"
      />,
    );

    expect(await screen.findByText("Eigene Person")).toBeInTheDocument();
    expect(screen.queryByText(/Im Urlaub bis/)).not.toBeInTheDocument();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });
});
