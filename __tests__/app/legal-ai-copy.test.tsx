import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AGBPage from "@/app/agb/page";
import DatenschutzPage from "@/app/datenschutz/page";
import ImpressumPage from "@/app/impressum/page";
import RichtlinienPage from "@/app/richtlinien/page";

describe("legal pages AI and pilot copy", () => {
  afterEach(() => cleanup());

  it("documents pilot Pflichtfelder and AI processing safeguards in Datenschutz", () => {
    render(<DatenschutzPage />);

    expect(screen.getByText(/Pilot-Phase Bad Saeckingen/i)).toBeInTheDocument();
    expect(screen.getByText(/users\.settings\.pilot_identity/i)).toBeInTheDocument();
    expect(screen.getByText(/KI-Anbieter nach Zweck/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Zero-Data-Retention/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Stand: Mai 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/5 bis 10 Familien/i)).not.toBeInTheDocument();
  });

  it("adds optional AI functions to the AGB", () => {
    render(<AGBPage />);

    expect(screen.getAllByText(/KI-Funktionen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Das Programm ist ohne sie in vollem Umfang nutzbar/i)).toBeInTheDocument();
    expect(screen.getByText(/schrittweise freigeschaltet/i)).toBeInTheDocument();
    expect(screen.getByText(/kein Hausnotruf, keine Leitstelle/i)).toBeInTheDocument();
    expect(screen.queryByText(/medizinische Notrufsysteme/i)).not.toBeInTheDocument();
  });

  it("shows the GmbH in Gruendung transition note in Impressum", () => {
    render(<ImpressumPage />);

    expect(screen.getByText(/Hinweis zur Rechtsform/i)).toBeInTheDocument();
    expect(screen.getByText(/Theobase GmbH befindet sich in Gründung/i)).toBeInTheDocument();
    expect(screen.queryByText(/27\.04\.2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/erfolgte beim Notariat/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Pilotbetrieb ist eine geschlossene/i)).toBeInTheDocument();
    expect(screen.getByText(/Stand: Mai 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/medizinische Notrufsysteme/i)).not.toBeInTheDocument();
  });

  it("keeps moderation policy linked with current legal package date", () => {
    render(<RichtlinienPage />);

    expect(screen.getByText(/Stand: Mai 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Barrierefreiheit/i })).toHaveAttribute(
      "href",
      "/barrierefreiheit",
    );
  });
});
