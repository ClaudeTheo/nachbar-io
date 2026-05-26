import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/(app)/dashboard/page";
import type { UserUiMode } from "@/lib/user-modes";

let mockedUiMode: UserUiMode = "active";
let mockedDashboardDensity: "standard" | "calm" | "simple" = "standard";

afterEach(cleanup);

vi.mock("@/app/(app)/dashboard/hooks/useDashboardData", () => ({
  getGreeting: () => ({ text: "Guten Tag", timeKey: "afternoon" }),
  useDashboardData: () => ({
    userName: "Test",
    uiMode: mockedUiMode,
    dashboardDensity: mockedDashboardDensity,
    reputationLevel: 0,
    alerts: [],
    news: [],
    helpRequests: [],
    marketplaceItems: [],
    loading: false,
    weatherData: null,
    caregivers: [],
    unreadCount: 0,
    currentQuarter: {
      id: "quarter-1",
      name: "Purkersdorfer/Sanary/Rebberg",
      city: "Bad Saeckingen",
      center_lat: null,
      center_lng: null,
      zoom_level: 16,
      map_config: null,
    },
    quarterLoading: false,
    loadDashboard: vi.fn(),
  }),
}));

vi.mock("@/components/PullToRefresh", () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/care/components/checkin/DailyCheckinBubble", () => ({
  DailyCheckinBubble: () => null,
}));

vi.mock("@/components/FloatingHelpButton", () => ({
  FloatingHelpButton: () => null,
}));

describe("Dashboard ui modes", () => {
  it("shows Gemeinschaft first for active users", () => {
    mockedUiMode = "active";
    mockedDashboardDensity = "standard";

    render(<DashboardPage />);

    expect(
      screen.getByRole("link", { name: /GemeinschaftGruppen, Nachbarn und Austausch/i }),
    ).toHaveAttribute("href", "/gruppen");
    expect(
      screen.getByRole("link", { name: /Mein TagHeute planen/i }),
    ).toHaveAttribute("href", "/my-day");
  });

  it("keeps start main areas aligned with the four-tab app structure", () => {
    mockedUiMode = "active";
    mockedDashboardDensity = "standard";

    render(<DashboardPage />);

    expect(
      screen.getByRole("link", { name: /Mein QuartierRathaus, Karte, Veranstaltungen/i }),
    ).toHaveAttribute("href", "/quartier-info");
    expect(
      screen.getByRole("link", { name: /Mein TagHeute planen/i }),
    ).toHaveAttribute("href", "/my-day");
    expect(
      screen.getByRole("link", { name: /IchProfil, Haushalt und Einstellungen/i }),
    ).toHaveAttribute("href", "/profile");
    expect(
      screen.queryByRole("link", { name: /Nachrichten/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Mein Tag first for Aktiv 55+ comfort users", () => {
    mockedUiMode = "comfort";
    mockedDashboardDensity = "calm";

    render(<DashboardPage />);

    expect(
      screen.getByRole("link", { name: /Mein TagTermine, Hinweise und Alltag/i }),
    ).toHaveAttribute("href", "/my-day");
    expect(
      screen.getByText("Was jetzt am naechsten liegt."),
    ).toBeInTheDocument();
  });
});
