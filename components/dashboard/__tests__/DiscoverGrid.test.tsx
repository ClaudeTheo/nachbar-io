// Tests für DiscoverGrid-Komponente
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DiscoverGrid } from "../DiscoverGrid";

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

describe("DiscoverGrid", () => {
  it("zeigt initial 12 primaere Kategorien", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const links = grid.querySelectorAll("a");
    expect(links.length).toBe(12);
  });

  it("zeigt 'Mehr entdecken' Button", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector('[data-testid="discover-expand"]');
    expect(btn).toBeInTheDocument();
  });

  it("zeigt alle Kategorien nach Klick auf 'Mehr entdecken'", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const links = grid.querySelectorAll("a");
    // 12 primaer + 13 sekundaer = 25
    expect(links.length).toBe(25);
    // Button verschwindet
    expect(
      container.querySelector('[data-testid="discover-expand"]'),
    ).not.toBeInTheDocument();
  });

  it("hat Lucide-Icons statt Emojis", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const svgs = grid.querySelectorAll("svg");
    expect(svgs.length).toBe(12);
  });

  it("primary enthaelt Leihboerse + Mitessen (vorher versteckt)", () => {
    const { container } = render(<DiscoverGrid />);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const hrefs = Array.from(grid.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/leihboerse");
    expect(hrefs).toContain("/mitessen");
  });

  it("secondary enthaelt Mein Tag + Pakete + Pflegegrad-Navigator (vorher versteckt)", () => {
    const { container } = render(<DiscoverGrid />);
    const btn = container.querySelector(
      '[data-testid="discover-expand"]',
    ) as HTMLElement;
    fireEvent.click(btn);
    const grid = container.querySelector('[data-testid="discover-grid"]')!;
    const hrefs = Array.from(grid.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/my-day");
    expect(hrefs).toContain("/packages");
    expect(hrefs).toContain("/pflegegrad-navigator");
  });
});
