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

vi.mock("@/lib/hooks/useMapStatuses", () => ({
  useMapStatuses: () => ({ geoHouses: [], residentCounts: {}, statuses: {} }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

vi.mock("@/lib/care/caregiver-pending-checkins", () => ({
  loadCaregiverPendingCheckinHouseholds: () => Promise.resolve(new Set()),
}));

vi.mock("@/components/dashboard/DiscoverGrid", () => ({
  DiscoverGrid: () => <div data-testid="discover-grid" />,
}));

vi.mock("@/components/map/MapThumbnail", () => ({
  MapThumbnail: () => <div data-testid="map-thumbnail" />,
}));

vi.mock("@/components/PullToRefresh", () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/care/components/checkin/DailyCheckinBubble", () => ({
  DailyCheckinBubble: () => null,
}));

vi.mock("@/components/brand/BrandFooter", () => ({
  BrandFooter: () => null,
}));

vi.mock("@/components/FloatingHelpButton", () => ({
  FloatingHelpButton: () => null,
}));

describe("Dashboard ui modes", () => {
  it("shows Gemeinschaft first for active users", () => {
    mockedUiMode = "active";
    mockedDashboardDensity = "standard";

    render(<DashboardPage />);

    expect(screen.getByText("Aktivmodus")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Gemeinschaft\s+Gruppen & Nachbarn/i }),
    ).toHaveAttribute("href", "/gruppen");
    expect(
      screen.queryByRole("link", { name: /Mein Tag\s+Termine, Hinweise, Alltag/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Mein Tag first for Aktiv 55+ comfort users", () => {
    mockedUiMode = "comfort";
    mockedDashboardDensity = "calm";

    render(<DashboardPage />);

    expect(screen.getByText("Aktiv 55+")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Mein Tag\s+Termine, Hinweise, Alltag/i }),
    ).toHaveAttribute("href", "/my-day");
    expect(
      screen.getByText("Ruhiger Ueberblick fuer aktive Nachbarn"),
    ).toBeInTheDocument();
  });
});
