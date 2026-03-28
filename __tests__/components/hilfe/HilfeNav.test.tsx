// __tests__/components/hilfe/HilfeNav.test.tsx
// Tests fuer die Hilfe-Sub-Navigation

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HilfeNav } from "@/modules/hilfe/components/HilfeNav";

// next/navigation mocken
vi.mock("next/navigation", () => ({
  usePathname: () => "/hilfe",
}));

describe("HilfeNav", () => {
  afterEach(() => cleanup());

  it("rendert alle 4 Navigationslinks", () => {
    render(<HilfeNav />);

    expect(screen.getByText("Gesuche")).toBeInTheDocument();
    expect(screen.getByText("Mein Profil")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Helfer werden")).toBeInTheDocument();
  });

  it("enthält die korrekten href-Attribute", () => {
    render(<HilfeNav />);

    expect(screen.getByText("Gesuche").closest("a")).toHaveAttribute("href", "/hilfe");
    expect(screen.getByText("Mein Profil").closest("a")).toHaveAttribute("href", "/hilfe/profil");
    expect(screen.getByText("Budget").closest("a")).toHaveAttribute("href", "/hilfe/budget");
    expect(screen.getByText("Helfer werden").closest("a")).toHaveAttribute("href", "/hilfe/helfer-werden");
  });
});
