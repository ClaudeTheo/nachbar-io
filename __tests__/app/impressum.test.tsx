import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ImpressumPage from "@/app/impressum/page";

// Impressum muss die erteilte USt-IdNr. ausweisen (§ 27a UStG),
// sobald sie vorliegt — erteilt am 23.06.2026.
describe("ImpressumPage", () => {
  it("zeigt die erteilte USt-IdNr. DE463152997", () => {
    render(<ImpressumPage />);
    expect(screen.getByText(/DE463152997/)).toBeInTheDocument();
  });

  it("behauptet nicht mehr, dass keine USt-IdNr. erteilt wurde", () => {
    render(<ImpressumPage />);
    expect(screen.queryByText(/noch nicht erteilt/)).toBeNull();
  });

  it("nennt die Theobase GmbH mit Registernummer", () => {
    render(<ImpressumPage />);
    expect(screen.getByText(/HRB 735685/)).toBeInTheDocument();
  });
});
