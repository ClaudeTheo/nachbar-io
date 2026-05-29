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
    expect(screen.queryByText(/5 bis 10 Familien/i)).not.toBeInTheDocument();
  });

  it("nennt die eingetragene GmbH mit HRB und Registergericht", () => {
    render(<DatenschutzPage />);

    expect(screen.getAllByText(/HRB 735685/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Amtsgericht Freiburg im Breisgau/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/in Gründung/i)).not.toBeInTheDocument();
  });

  it("beschreibt Vercel-Hosting praezise ohne zu weitgehende No-Data-Zusage", () => {
    render(<DatenschutzPage />);

    expect(screen.getByText(/technisch notwendige Zugriffsdaten/i)).toBeInTheDocument();
    expect(screen.getAllByText(/IP-Adresse/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/personenbezogene Nutzerdaten werden nicht an Vercel/i),
    ).not.toBeInTheDocument();
  });

  it("nennt in der Löschliste die Art.-9-Gesundheitsdaten und die Anonymisierung von Protokolldaten (Audit B6)", () => {
    render(<DatenschutzPage />);

    // Die Löschliste muss die früher ausgelassenen Care-/Art.9-Daten ehrlich nennen
    expect(screen.getAllByText(/Gesundheits- und Pflegedaten/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Medikamente/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KI-Gedächtnis/i).length).toBeGreaterThan(0);
    // Sicherheits-/Protokolldaten werden anonymisiert statt gelöscht (Founder-Entscheidung)
    expect(screen.getAllByText(/anonymisiert/i).length).toBeGreaterThan(0);
  });
});
