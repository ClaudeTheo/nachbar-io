import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { YouthExchangeSurface } from "@/modules/youth/components/YouthExchangeSurface";

describe("YouthExchangeSurface", () => {
  afterEach(cleanup);

  it("beschraenkt die Jugend-Boerse auf Tauschen und Verschenken", () => {
    render(<YouthExchangeSurface />);

    expect(screen.getByRole("heading", { name: "Tauschen & Verschenken" })).toBeInTheDocument();
    expect(screen.getAllByText("Tauschen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verschenken").length).toBeGreaterThan(0);
    expect(screen.queryByText("Verkaufen")).not.toBeInTheDocument();
    expect(screen.queryByText("Preis")).not.toBeInTheDocument();
  });

  it("zeigt die Sicherheitsregeln ohne Adressen und ohne Zahlung", () => {
    render(<YouthExchangeSurface />);

    expect(screen.getByText(/Keine Zahlung in der App/i)).toBeInTheDocument();
    expect(screen.getAllByText(/keine Adresse/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/nur im Quartier/i)).toBeInTheDocument();
  });

  it("erstellt einen sicheren lokalen Tausch-Entwurf ohne Preisfeld", async () => {
    const user = userEvent.setup();
    render(<YouthExchangeSurface />);

    await user.type(screen.getByLabelText("Was gibst du ab?"), "Comic-Heft");
    await user.type(screen.getByLabelText("Was suchst du dafür?"), "Kartenspiel");
    await user.click(screen.getByLabelText(/keine Adresse und kein Geld/i));

    expect(screen.getByText("Comic-Heft")).toBeInTheDocument();
    expect(screen.getByText("Kartenspiel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entwurf prüfen" })).toBeEnabled();
    expect(screen.queryByLabelText(/Preis/i)).not.toBeInTheDocument();
  });

  it("blendet die Tauschfrage beim Verschenken aus", async () => {
    const user = userEvent.setup();
    render(<YouthExchangeSurface />);

    await user.click(screen.getByRole("button", { name: "Verschenken wählen" }));

    expect(screen.queryByLabelText("Was suchst du dafür?")).not.toBeInTheDocument();
    expect(screen.getByText("Verschenk-Entwurf")).toBeInTheDocument();
  });
});
