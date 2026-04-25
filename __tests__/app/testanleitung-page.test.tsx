import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TestanleitungPage from "@/app/(auth)/testanleitung/page";

describe("TestanleitungPage", () => {
  afterEach(() => cleanup());

  it("beschreibt den aktuellen Pilot-Registrierungsflow ohne alte Passwort- oder Anzeigenamen-Schritte", () => {
    render(<TestanleitungPage />);

    expect(
      screen.getByText(/vorname, nachname und geburtsdatum/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/ki-hilfe/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/einmal-code/i)).toBeInTheDocument();
    expect(screen.queryByText(/passwort.*mindestens 8 zeichen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/anzeigenamen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/normal.*seniorenmodus/i)).not.toBeInTheDocument();
  });
});
