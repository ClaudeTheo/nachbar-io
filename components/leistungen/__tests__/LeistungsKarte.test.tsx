import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LeistungsKarte } from "../LeistungsKarte";
import type { Leistung } from "@/lib/leistungen/types";

const sampleDe: Leistung = {
  slug: "pflegegeld",
  country: "DE",
  title: "Pflegegeld",
  shortDescription: "Monatliche Zahlung fuer haeusliche Pflege.",
  longDescription: "Wird direkt ausgezahlt.",
  amount: "347 EUR / Monat",
  legalSource: "Paragraf 37 SGB XI",
  officialLink: "https://example.org/pflegegeld",
  lastReviewed: "2026-04-18",
};

describe("LeistungsKarte", () => {
  afterEach(() => cleanup());

  it("rendert Titel und Beschreibung", () => {
    render(<LeistungsKarte leistung={sampleDe} />);
    expect(screen.getByText("Pflegegeld")).toBeDefined();
    expect(screen.getByText(/Wird direkt ausgezahlt/i)).toBeDefined();
  });

  it("rendert Betrag und Rechtsquelle", () => {
    render(<LeistungsKarte leistung={sampleDe} />);
    expect(screen.getByText("347 EUR / Monat")).toBeDefined();
    expect(screen.getByText(/Paragraf 37 SGB XI/)).toBeDefined();
  });

  it("rendert externen Link mit noopener+noreferrer+_blank", () => {
    render(<LeistungsKarte leistung={sampleDe} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.org/pflegegeld");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("zeigt Kanton-Variante bei cantonVariant-Prop", () => {
    const withVariant: Leistung = {
      ...sampleDe,
      slug: "el-kubk",
      country: "CH",
      amount: "kantonal unterschiedlich",
      cantonVariants: {
        AG: {
          amount: "5 000 CHF / Jahr",
          note: "SVA Aargau",
          officialLink: "https://sva-aargau.ch",
        },
      },
    };
    render(
      <LeistungsKarte
        leistung={withVariant}
        cantonVariant={withVariant.cantonVariants!.AG}
      />,
    );
    expect(screen.getByText(/5 000 CHF/)).toBeDefined();
    expect(screen.getByText(/SVA Aargau/)).toBeDefined();
  });
});
