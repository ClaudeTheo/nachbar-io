import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PlusTeaserKarte } from "../PlusTeaserKarte";

describe("PlusTeaserKarte", () => {
  afterEach(() => cleanup());

  it("zeigt Plus-Badge und verlinkt auf Info-Seite bei Plus-Nutzern", () => {
    render(<PlusTeaserKarte hasPlus={true} />);
    expect(screen.getByText(/Plus/i)).toBeDefined();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/was-steht-uns-zu");
  });

  it("leitet Free-Nutzer auf /care/subscription mit from=leistungen", () => {
    render(<PlusTeaserKarte hasPlus={false} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(
      "/care/subscription?from=leistungen",
    );
  });

  it("zeigt Untertitel mit 5 Pflege-Leistungen-Hinweis", () => {
    render(<PlusTeaserKarte hasPlus={false} />);
    expect(screen.getByText(/Pflege/i)).toBeDefined();
  });
});
