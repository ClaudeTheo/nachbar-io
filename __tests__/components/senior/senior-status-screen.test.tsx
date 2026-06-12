// __tests__/components/senior/senior-status-screen.test.tsx
// Welle S1 / Befund B3:2 (WCAG 2.2.1 "Timing Adjustable"): Der SeniorStatusScreen
// leitet NICHT mehr automatisch nach einem Timer weiter. Gerade nach einem SOS
// will der Senior den Status behalten. Stattdessen entscheidet er selbst per
// grossem "Zurück zur Startseite"-Button (Ziel: kanonische Shell /kreis-start).

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SeniorStatusScreen } from "@/modules/care/components/senior/SeniorStatusScreen";

afterEach(() => {
  cleanup();
});

describe("SeniorStatusScreen — kein Auto-Redirect (B3:2)", () => {
  it("zeigt einen Link 'Zurück zur Startseite' auf /kreis-start", () => {
    render(<SeniorStatusScreen type="sos_sent" />);
    const link = screen.getByRole("link", {
      name: /zur(ü|ue)ck zur startseite/i,
    });
    expect(link).toHaveAttribute("href", "/kreis-start");
  });

  it("Senior-Touch-Target: Button hat min-height 80px", () => {
    render(<SeniorStatusScreen type="sos_sent" />);
    const link = screen.getByRole("link", {
      name: /zur(ü|ue)ck zur startseite/i,
    });
    expect(link.style.minHeight).toBe("80px");
  });

  it("Statuswechsel wird für Screenreader angesagt (role=status)", () => {
    render(<SeniorStatusScreen type="checkin_ok" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("zeigt keinen Auto-Redirect-Countdown mehr", () => {
    render(<SeniorStatusScreen type="sos_sent" />);
    expect(screen.queryByText(/in \d+ Sekunden/i)).not.toBeInTheDocument();
  });
});
