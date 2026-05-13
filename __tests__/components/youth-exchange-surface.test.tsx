import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { YouthExchangeSurface } from "@/modules/youth/components/YouthExchangeSurface";

describe("YouthExchangeSurface", () => {
  afterEach(cleanup);

  it("beschraenkt die Jugend-Boerse auf Tauschen und Verschenken", () => {
    render(<YouthExchangeSurface />);

    expect(screen.getByRole("heading", { name: "Tauschen & Verschenken" })).toBeInTheDocument();
    expect(screen.getByText("Tauschen")).toBeInTheDocument();
    expect(screen.getByText("Verschenken")).toBeInTheDocument();
    expect(screen.queryByText("Verkaufen")).not.toBeInTheDocument();
    expect(screen.queryByText("Preis")).not.toBeInTheDocument();
  });

  it("zeigt die Sicherheitsregeln ohne Adressen und ohne Zahlung", () => {
    render(<YouthExchangeSurface />);

    expect(screen.getByText(/Keine Zahlung in der App/i)).toBeInTheDocument();
    expect(screen.getByText(/keine Adresse/i)).toBeInTheDocument();
    expect(screen.getByText(/nur im Quartier/i)).toBeInTheDocument();
  });
});
