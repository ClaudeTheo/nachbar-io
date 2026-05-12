import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QuartierAppLogo } from "@/components/brand/QuartierAppLogo";

describe("QuartierAppLogo", () => {
  afterEach(() => {
    cleanup();
  });

  describe("variant", () => {
    it("default = symbol mit Symbol-Asset", () => {
      render(<QuartierAppLogo />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("src")).toBe("/brand/quartierapp-symbol.png");
      expect(img.getAttribute("alt")).toBe("QuartierApp");
    });

    it("variant=full nutzt Full-Logo + langes Alt", () => {
      render(<QuartierAppLogo variant="full" />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("src")).toBe("/brand/quartierapp-logo.png");
      expect(img.getAttribute("alt")).toBe(
        "QuartierApp — Ihr digitales Quartier",
      );
    });

    it("variant=mono nutzt Symbol-Asset + grayscale-Class", () => {
      render(<QuartierAppLogo variant="mono" />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("src")).toBe("/brand/quartierapp-symbol.png");
      expect(img.className).toContain("grayscale");
    });
  });

  describe("size", () => {
    it("size=sm => 24 px hoehe", () => {
      render(<QuartierAppLogo size="sm" />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("height")).toBe("24");
    });

    it("size=md => 40 px hoehe (default)", () => {
      render(<QuartierAppLogo size="md" />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("height")).toBe("40");
    });

    it("size=lg => 80 px hoehe", () => {
      render(<QuartierAppLogo size="lg" />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("height")).toBe("80");
    });

    it("size=120 (number) => 120 px hoehe", () => {
      render(<QuartierAppLogo size={120} />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("height")).toBe("120");
    });
  });

  describe("aspect ratio", () => {
    it("symbol bei height=40 => width=57 (Aspect 820/580)", () => {
      render(<QuartierAppLogo variant="symbol" size={40} />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("width")).toBe("57");
      expect(img.getAttribute("height")).toBe("40");
    });

    it("full bei height=40 => width=55 (Aspect 1380/1000)", () => {
      render(<QuartierAppLogo variant="full" size={40} />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("width")).toBe("55");
      expect(img.getAttribute("height")).toBe("40");
    });

    it("symbol bei height=80 => width=113 (proportional)", () => {
      render(<QuartierAppLogo variant="symbol" size={80} />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("width")).toBe("113");
      expect(img.getAttribute("height")).toBe("80");
    });
  });

  describe("Props", () => {
    it("nimmt zusaetzliche className auf", () => {
      render(<QuartierAppLogo className="custom-class" />);
      const img = screen.getByRole("img");
      expect(img.className).toContain("custom-class");
      expect(img.className).toContain("object-contain");
    });

    it("setzt draggable=false", () => {
      render(<QuartierAppLogo />);
      const img = screen.getByRole("img");
      expect(img.getAttribute("draggable")).toBe("false");
    });
  });
});
