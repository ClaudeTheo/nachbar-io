// Welle C - Senior-Touch-Targets.
// Die Senior-Navigation muss die 80px-Regel auch fuer sekundaere Aktionen
// einhalten, nicht nur fuer die grossen Kernkacheln.

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/senior/home",
}));

afterEach(() => {
  cleanup();
});

describe("SeniorLayout Touch-Targets", () => {
  it("Header-Zurueckaktion und Notruf-Leiste haben mindestens 80px Touch-Hoehe", async () => {
    const { default: SeniorLayout } = await import("@/app/senior/layout");

    render(
      <SeniorLayout>
        <p>Inhalt</p>
      </SeniorLayout>,
    );

    expect(
      screen.getByRole("link", { name: /zur startseite|zurueck|zurück/i })
        .style.minHeight,
    ).toBe("80px");
    expect(screen.getByRole("link", { name: /notruf 112/i }).style.minHeight)
      .toBe("80px");
  });
});

describe("KreisStartPage Touch-Targets", () => {
  it("sekundaere Start-Aktionen Termine und Mein Profil sind 80px Touch-Targets", async () => {
    const { default: KreisStartPage } = await import(
      "@/app/(senior)/kreis-start/page"
    );

    render(<KreisStartPage />);

    const secondaryActions = screen.getByTestId("kreis-start-secondary-actions");
    expect(
      within(secondaryActions).getByRole("link", { name: /termine/i }).style
        .minHeight,
    ).toBe("80px");
    expect(
      within(secondaryActions).getByRole("link", { name: /mein profil/i }).style
        .minHeight,
    ).toBe("80px");
  });
});
