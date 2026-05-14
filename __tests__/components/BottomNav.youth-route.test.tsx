import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockPathname = vi.fn(() => "/jugend/tauschen");

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
    useNavRole: () => ({ role: "org_admin", loading: false }),
  };
});

import { BottomNav } from "@/components/BottomNav";

afterEach(() => {
  cleanup();
  mockPathname.mockReturnValue("/jugend/tauschen");
});

describe("BottomNav auf Jugend-Routen", () => {
  it("zeigt auch fuer Admins die Jugend-Navigation innerhalb der Jugend-App", () => {
    render(<BottomNav />);

    expect(screen.getByRole("link", { name: /Start/i })).toHaveAttribute(
      "href",
      "/jugend",
    );
    expect(screen.getByRole("link", { name: /Tauschen/i })).toHaveAttribute(
      "href",
      "/jugend/tauschen",
    );
    expect(screen.getByRole("link", { name: /Gruppen/i })).toHaveAttribute(
      "href",
      "/jugend/gruppen",
    );
    expect(screen.queryByText("Verwaltung")).toBeNull();
  });
});
