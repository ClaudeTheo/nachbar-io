import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AGBPage from "@/app/agb/page";
import DatenschutzPage from "@/app/datenschutz/page";
import ImpressumPage from "@/app/impressum/page";

describe("legal pages AI and pilot copy", () => {
  afterEach(() => cleanup());

  it("documents pilot Pflichtfelder and AI processing safeguards in Datenschutz", () => {
    render(<DatenschutzPage />);

    expect(screen.getByText(/Pilot-Phase Bad Saeckingen/i)).toBeInTheDocument();
    expect(screen.getByText(/users\.settings\.pilot_identity/i)).toBeInTheDocument();
    expect(screen.getByText(/KI-Anbieter nach Zweck/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Zero-Data-Retention/i).length).toBeGreaterThan(0);
  });

  it("adds optional AI functions to the AGB", () => {
    render(<AGBPage />);

    expect(screen.getAllByText(/KI-Funktionen/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Das Programm ist ohne sie in vollem Umfang nutzbar/i)).toBeInTheDocument();
    expect(screen.getByText(/schrittweise freigeschaltet/i)).toBeInTheDocument();
  });

  it("shows the GmbH in Gruendung transition note in Impressum", () => {
    render(<ImpressumPage />);

    expect(screen.getByText(/Hinweis zur Rechtsform/i)).toBeInTheDocument();
    expect(screen.getByText(/Theobase GmbH i\.G\./i)).toBeInTheDocument();
    expect(screen.getByText(/ist fuer den 27\.04\.2026 geplant/i)).toBeInTheDocument();
    expect(screen.queryByText(/erfolgte beim Notariat/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Pilotbetrieb ist eine geschlossene/i)).toBeInTheDocument();
  });
});
