import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import RichtlinienPage from "@/app/richtlinien/page";

describe("RichtlinienPage", () => {
  afterEach(() => cleanup());

  it("nennt Meldestelle, 24h-Pilotpruefung und Begruendung fuer Moderation", () => {
    render(<RichtlinienPage />);

    expect(screen.getByText(/Meldestelle fuer rechtswidrige Inhalte/i)).toBeInTheDocument();
    expect(screen.getByText(/innerhalb von 24 Stunden/i)).toBeInTheDocument();
    expect(screen.getByText(/wesentlichen Grund/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /thomasth@gmx.de/i })
        .some((link) =>
          link
            .getAttribute("href")
            ?.startsWith("mailto:thomasth@gmx.de?subject=Meldung"),
        ),
    ).toBe(true);
  });
});
