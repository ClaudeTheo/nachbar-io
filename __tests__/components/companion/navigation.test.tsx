// Tests: KI-Assistent Navigation — prueft ob /companion in der BottomNav enthalten ist

import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

// Next.js Mocks
const mockPathname = vi.fn(() => "/dashboard");
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
  isUxRedesignEnabled: () => false,
}));

import { BottomNav } from "@/components/BottomNav";

afterEach(() => {
  cleanup();
  mockPathname.mockReturnValue("/dashboard");
});

describe("BottomNav — KI-Assistent Eintrag", () => {
  it("zeigt den KI-Assistent Link mit /companion Route", () => {
    render(<BottomNav />);

    const link = screen.getByRole("link", { name: /KI-Assistent/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/companion");
  });

  it("enthaelt alle erwarteten Navigationspunkte", () => {
    render(<BottomNav />);

    const expectedLabels = [
      "Home",
      "Karte",
      "Hilfe",
      "Pflege",
      "KI-Assistent",
      "Inbox",
      "Profil",
    ];
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it("markiert /companion als aktiv wenn Pfad uebereinstimmt", () => {
    mockPathname.mockReturnValue("/companion");

    render(<BottomNav />);
    const link = screen.getByRole("link", { name: /KI-Assistent/i });
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});
