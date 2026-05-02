import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { QuarterProvider, useQuarter } from "../quarter-context";

const householdMemberTerminals: string[] = [];

vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

function createTableMock(table: string) {
  if (table === "users") {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      single: vi.fn().mockResolvedValue({
        data: { role: "resident" },
        error: null,
      }),
    };
  }

  if (table === "household_members") {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      not() {
        return this;
      },
      limit() {
        return this;
      },
      single: vi.fn().mockImplementation(() => {
        householdMemberTerminals.push("single");
        return Promise.resolve({ data: null, error: null });
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        householdMemberTerminals.push("maybeSingle");
        return Promise.resolve({ data: null, error: null });
      }),
    };
  }

  throw new Error(`Unexpected table: ${table}`);
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => createTableMock(table),
  }),
}));

function QuarterStatus() {
  const { loading } = useQuarter();
  return <div>{loading ? "laedt" : "fertig"}</div>;
}

describe("QuarterProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    householdMemberTerminals.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it("verwendet fuer optionale Haushaltsmitgliedschaft maybeSingle statt 406-ausloesendem single", async () => {
    render(
      <QuarterProvider>
        <QuarterStatus />
      </QuarterProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("fertig")).toBeInTheDocument();
    });

    expect(householdMemberTerminals).toContain("maybeSingle");
    expect(householdMemberTerminals).not.toContain("single");
  });
});
