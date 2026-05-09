import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import LandingPage from "@/app/page";

describe("Closed-Pilot-Startseite", () => {
  afterEach(() => cleanup());

  it("zeigt nur den geschlossenen Pilot statt oeffentlicher Produktwerbung", () => {
    const { container } = render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /geschlossener pilot/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nicht öffentlich freigeschaltet/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /registrieren/i })).toBeNull();
    expect(screen.getByRole("link", { name: /anmelden/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });
});
