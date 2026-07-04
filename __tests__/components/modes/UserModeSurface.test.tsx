import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import {
  GenerationModeMatrix,
  ModeComparisonPreview,
  UserModeChoiceCard,
  UserModeFocusStrip,
} from "@/components/modes/UserModeSurface";

afterEach(cleanup);

describe("UserModeSurface", () => {
  it("rendert alle vier Modi als unterscheidbare Preview", () => {
    render(<ModeComparisonPreview />);

    for (const mode of ["youth", "active", "comfort", "senior"]) {
      expect(screen.getByTestId(`user-mode-preview-${mode}`)).toBeTruthy();
    }
    expect(screen.getByText("Junges Quartier")).toBeInTheDocument();
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getByText("Aktiv 55+")).toBeInTheDocument();
    expect(screen.getByText("Einfach")).toBeInTheDocument();
  });

  it("funktioniert im Onboarding als auswaehlbarer Button", () => {
    const onSelect = vi.fn();

    render(
      <UserModeChoiceCard
        active
        mode="comfort"
        onSelect={onSelect}
      />,
    );

    const button = screen.getByRole("button", { name: /aktiv 55\+/i });
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledWith("comfort");
  });

  it("zeigt im Dashboard die passende Modus-Aktion", () => {
    render(<UserModeFocusStrip mode="senior" />);

    expect(
      screen.getByRole("region", { name: /grosse tasten/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /einfach starten/i }),
    ).toHaveAttribute("href", "/kreis-start");
    expect(screen.getAllByText(/Notruf zuerst/i).length).toBeGreaterThan(0);
  });

  it("rendert die Generation-Design-Matrix mit geparkter Jugend-XP", () => {
    render(<GenerationModeMatrix />);

    expect(screen.getByTestId("generation-mode-matrix-active")).toBeTruthy();
    expect(screen.getByTestId("generation-mode-matrix-comfort")).toBeTruthy();
    expect(screen.getByTestId("generation-mode-matrix-youth")).toBeTruthy();
    expect(screen.getByTestId("community-xp-preview")).toHaveTextContent(
      /UI-only/i,
    );
    expect(screen.getAllByText(/Keine Ranglisten/i).length).toBeGreaterThan(0);
  });
});
