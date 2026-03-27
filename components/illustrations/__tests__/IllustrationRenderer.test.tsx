// Tests für IllustrationRenderer
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { IllustrationRenderer } from "../IllustrationRenderer";

// Globales fetch mocken
const mockSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><line x1="0" y1="0" x2="100" y2="100"/></svg>';

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      text: () => Promise.resolve(mockSvg),
    }),
  );
});

describe("IllustrationRenderer", () => {
  it("rendert SVG inline nach dem Laden", async () => {
    const { container } = render(
      <IllustrationRenderer name="ill-01-dorfplatz" />,
    );

    await waitFor(() => {
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  it("setzt aria-hidden auf den Container", () => {
    const { container } = render(
      <IllustrationRenderer name="ill-01-dorfplatz" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
  });

  it("respektiert prefers-reduced-motion", async () => {
    // Mock: reduced motion aktiviert
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(
      <IllustrationRenderer name="ill-01-dorfplatz" animated />,
    );

    await waitFor(() => {
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    // Bei reduced motion: keine stroke-dasharray gesetzt
    const line = container.querySelector("line");
    if (line) {
      expect(line.style.strokeDasharray).toBe("");
    }
  });

  it("übergibt custom className", () => {
    const { container } = render(
      <IllustrationRenderer name="ill-02-nachbarn" className="my-custom" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("my-custom");
  });
});
