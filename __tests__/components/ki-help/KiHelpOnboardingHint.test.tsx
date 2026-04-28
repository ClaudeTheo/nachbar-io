import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KiHelpOnboardingHint } from "@/components/ki-help/KiHelpOnboardingHint";

describe("KiHelpOnboardingHint", () => {
  afterEach(() => cleanup());

  it("renders the static hint for the current register step", () => {
    render(<KiHelpOnboardingHint step="address" />);
    expect(screen.getByText(/Ihre Adresse hilft/i)).toBeInTheDocument();
    expect(screen.getByText(/nicht öffentlich angezeigt/i)).toBeInTheDocument();
  });

  it("uses the existing pulse dot as decorative visual, not a second FAQ trigger", () => {
    render(<KiHelpOnboardingHint step="entry" />);
    expect(
      screen.getByText(/Ich begleite Sie Schritt für Schritt/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    ).not.toBeInTheDocument();
  });
});
