import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DatenschutzPage from "@/app/datenschutz/page";

describe("DatenschutzPage", () => {
  afterEach(() => cleanup());

  it("nennt die Pilot-Pflichtdaten fuer die Registrierung", () => {
    render(<DatenschutzPage />);

    expect(screen.getByText(/Vorname und Nachname/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Geburtsdatum/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Adresse.*Quartier-Zuordnung/i)).toBeInTheDocument();
    expect(screen.queryByText(/kein Klarname erforderlich/i)).not.toBeInTheDocument();
  });
});
