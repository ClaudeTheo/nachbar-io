// __tests__/app/b2b/page.test.tsx
// C3:1 — Die B2B-Landingpage darf nur Features bewerben, die Org-Admins im
// /org-Portal tatsaechlich haben (Mangelmelder-Moderation, Statistik-Dashboard,
// Bekanntmachungen). Keine Nutzer-Sperre, kein Eskalationsmanagement, kein
// CSV/XLSX-Export (nicht im Portal verdrahtet).

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import B2BPage from "@/app/b2b/page";

afterEach(() => cleanup());

describe("/b2b — getrimmte Feature-Claims (C3:1)", () => {
  it("bewirbt keine nicht implementierten Funktionen", () => {
    render(<B2BPage />);

    expect(screen.queryByText(/stummschalten/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Eskalationsmanagement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CSV|XLSX/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Nutzer .*(stummschalten|sperren)/i),
    ).not.toBeInTheDocument();
  });

  it("bewirbt die real vorhandenen Org-Funktionen", () => {
    render(<B2BPage />);

    expect(screen.getByText(/Meldungs-Management/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Mängelmelder-Meldungen moderieren/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bekanntmachungen veröffentlichen/i),
    ).toBeInTheDocument();
  });
});
