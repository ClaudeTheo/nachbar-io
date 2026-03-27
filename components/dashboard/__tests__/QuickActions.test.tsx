// Tests für QuickActions-Komponente
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QuickActions } from "../QuickActions";

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

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

describe("QuickActions", () => {
  it("rendert 4 Schnellaktionen mit korrekten Links", () => {
    const { container } = render(<QuickActions />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(4);

    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/board");
    expect(hrefs).toContain("/marketplace");
    expect(hrefs).toContain("/waste-calendar");
    expect(hrefs).toContain("/reports/new");
  });

  it("zeigt Labels für alle Aktionen", () => {
    const { container } = render(<QuickActions />);
    const text = container.textContent;
    expect(text).toContain("Brett");
    expect(text).toContain("Marktplatz");
    expect(text).toContain("Kalender");
    expect(text).toContain("Melden");
  });
});
