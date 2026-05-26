import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPathname = vi.hoisted(() => vi.fn(() => "/dashboard"));
const mockNavState = vi.hoisted(() => ({
  current: {
    role: "senior",
    uiMode: "active",
    loading: false,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/useUnreadCount", () => ({
  useUnreadCount: () => ({ count: 0 }),
}));

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

vi.mock("@/lib/ux-flags", () => ({
  isUxRedesignEnabled: () => true,
}));

vi.mock("@/components/nav/NavConfig", async (importActual) => {
  const actual =
    await importActual<typeof import("@/components/nav/NavConfig")>();

  return {
    ...actual,
    useNavRole: () => mockNavState.current,
  };
});

import { BottomNav } from "@/components/BottomNav";

afterEach(() => {
  cleanup();
  mockPathname.mockReturnValue("/dashboard");
  mockNavState.current = {
    role: "senior",
    uiMode: "active",
    loading: false,
  };
});

describe("BottomNav ui_mode labels", () => {
  it("zeigt fuer Erwachsene das kurze Quartier-Label", () => {
    render(<BottomNav />);

    expect(screen.getByText("Quartier")).toBeInTheDocument();
    expect(screen.queryByText("Mein Quartier")).not.toBeInTheDocument();
  });

  it("zeigt fuer Aktiv 55+ das ruhigere Mein-Quartier-Label", () => {
    mockNavState.current = {
      role: "senior",
      uiMode: "comfort",
      loading: false,
    };

    render(<BottomNav />);

    expect(screen.getByText("Mein Quartier")).toBeInTheDocument();
  });
});
