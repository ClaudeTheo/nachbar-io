import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SlideReady } from "@/modules/onboarding/components/slides/SlideReady";
import { SlideWelcome } from "@/modules/onboarding/components/slides/SlideWelcome";

describe("Pilot copy in onboarding slides", () => {
  afterEach(() => cleanup());

  it("ordnet die Welcome-Tour als geschlossenen Pilot mit Anzeigename ein", () => {
    render(<SlideWelcome />);

    expect(screen.getByText(/geschlossener pilot/i)).toBeInTheDocument();
    expect(screen.getByText(/bad s[aä]ckingen/i)).toBeInTheDocument();
    expect(screen.getByText(/anzeigename/i)).toBeInTheDocument();
  });

  it("stellt klar, dass die App ohne KI weiter funktioniert", () => {
    render(<SlideReady displayName="Thomas" />);

    expect(screen.getByText(/ki.*schrittweise/i)).toBeInTheDocument();
    expect(screen.getByText(/einwilligung/i)).toBeInTheDocument();
    expect(screen.getByText(/ohne ki/i)).toBeInTheDocument();
  });
});
