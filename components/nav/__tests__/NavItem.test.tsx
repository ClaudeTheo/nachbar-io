// Tests für NavItem-Komponente
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavItem } from "../NavItem";
import { Home, TriangleAlert } from "lucide-react";

// Next.js Link mock
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

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

describe("NavItem", () => {
  it("rendert Label und Link", () => {
    render(
      <NavItem
        href="/dashboard"
        label="Zuhause"
        icon={Home}
        activeColor="text-quartier-green"
        isActive={false}
      />,
    );
    expect(screen.getByText("Zuhause")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/dashboard");
  });

  it("zeigt Active-Dot im aktiven Zustand", () => {
    const { container } = render(
      <NavItem
        href="/dashboard"
        label="Zuhause"
        icon={Home}
        activeColor="text-quartier-green"
        isActive={true}
      />,
    );
    // Active-Dot vorhanden
    const dot = container.querySelector(".bg-quartier-green");
    expect(dot).toBeInTheDocument();
    // aria-current gesetzt
    const link = container.querySelector("a[aria-current='page']");
    expect(link).toBeInTheDocument();
  });

  it("zeigt keinen Active-Dot im inaktiven Zustand", () => {
    const { container } = render(
      <NavItem
        href="/dashboard"
        label="Zuhause"
        icon={Home}
        activeColor="text-quartier-green"
        isActive={false}
      />,
    );
    const dot = container.querySelector(".bg-quartier-green");
    expect(dot).not.toBeInTheDocument();
  });

  it("zeigt Badge wenn vorhanden", () => {
    render(
      <NavItem
        href="/profile"
        label="Profil"
        icon={Home}
        activeColor="text-violet-500"
        isActive={false}
        badge={3}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("zeigt 9+ bei mehr als 9 Nachrichten", () => {
    render(
      <NavItem
        href="/profile"
        label="Profil"
        icon={Home}
        activeColor="text-violet-500"
        isActive={false}
        badge={15}
      />,
    );
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("zeigt keinen Badge bei 0", () => {
    render(
      <NavItem
        href="/profile"
        label="Profil"
        icon={Home}
        activeColor="text-violet-500"
        isActive={false}
        badge={0}
      />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("rendert Notfall-Item mit Amber-Ring", () => {
    const { container } = render(
      <NavItem
        href="/alerts/new"
        label="Notfall"
        icon={TriangleAlert}
        activeColor="text-alert-amber"
        isActive={false}
        isEmergency={true}
      />,
    );
    // Ring-Klasse vorhanden
    const ring = container.querySelector(".ring-alert-amber\\/30");
    expect(ring).toBeInTheDocument();
  });
});
