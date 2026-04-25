import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import OnboardingAnleitungPage from "@/app/(auth)/onboarding-anleitung/page";

describe("OnboardingAnleitungPage", () => {
  afterEach(() => cleanup());

  it("erklaert Pilotstatus, Datenschutz und den naechsten Schritt in einfacher Sprache", () => {
    render(<OnboardingAnleitungPage />);

    expect(screen.getByText(/geschlossener test/i)).toBeInTheDocument();
    expect(screen.getByText(/bad s[aä]ckingen/i)).toBeInTheDocument();
    expect(screen.getByText(/daten in einfacher sprache/i)).toBeInTheDocument();
    expect(screen.getByText(/nur das n[oö]tige/i)).toBeInTheDocument();
    expect(screen.getByText(/einmal-code/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /ki-hilfe.*schrittweise/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/nur mit ihrer einwilligung/i)).toBeInTheDocument();
    expect(screen.getByText(/ohne ki/i)).toBeInTheDocument();
  });
});
