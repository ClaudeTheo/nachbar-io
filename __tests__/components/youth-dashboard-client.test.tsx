import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useYouthProfile: vi.fn(() => ({
    loading: false,
    profile: {
      access_level: "freigeschaltet",
      age_group: "u16",
      birth_year: 2011,
      quarter_id: "quarter-1",
      total_points: 120,
    },
  })),
}));

vi.mock("@/modules/youth/services/hooks", () => ({
  useYouthProfile: mocks.useYouthProfile,
}));

vi.mock("@/components/NachbarKarte", () => ({
  NachbarKarte: ({ activityMode }: { activityMode?: string }) => (
    <div data-activity-mode={activityMode} data-testid="nachbar-karte" />
  ),
}));

vi.mock("@/modules/youth/components/TaskBoard", () => ({
  TaskBoard: ({ quarterId }: { quarterId?: string }) => (
    <div data-quarter-id={quarterId} data-testid="task-board" />
  ),
}));

describe("YouthDashboardClient", () => {
  afterEach(() => {
    cleanup();
    mocks.useYouthProfile.mockClear();
  });

  it("setzt die Hauptkarte in den Jugendmodus", async () => {
    const { YouthDashboardClient } = await import(
      "@/modules/youth/components/YouthDashboardClient"
    );

    render(<YouthDashboardClient />);

    expect(screen.getByTestId("nachbar-karte")).toHaveAttribute(
      "data-activity-mode",
      "youth",
    );
    expect(screen.getByTestId("task-board")).toHaveAttribute(
      "data-quarter-id",
      "quarter-1",
    );
  });
});
