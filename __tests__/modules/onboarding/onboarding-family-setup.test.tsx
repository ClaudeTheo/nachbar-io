import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SlideFamilySetup } from "@/modules/onboarding/components/slides/SlideFamilySetup";

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

describe("SlideFamilySetup", () => {
  afterEach(cleanup);

  it("suggests the youth app when parents indicate children from 13", () => {
    render(<SlideFamilySetup selected={[]} onToggle={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Kinder ab 13/i }));

    expect(screen.getByText(/Jugendbereich/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Jetzt Kinderzugang vorbereiten/i }),
    ).toHaveAttribute("href", "/profile?familySetup=child");
    expect(screen.getByText(/Später im Profil/i)).toBeInTheDocument();
  });

  it("suggests senior setup for relatives and keeps the adult flow optional", () => {
    render(<SlideFamilySetup selected={[]} onToggle={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Senior/i }));

    expect(
      screen.getByRole("link", { name: /Jetzt Senior-Zugang vorbereiten/i }),
    ).toHaveAttribute("href", "/profile?familySetup=senior");
    expect(screen.getByText(/Sie können einfach weitergehen/i)).toBeInTheDocument();
  });
});
