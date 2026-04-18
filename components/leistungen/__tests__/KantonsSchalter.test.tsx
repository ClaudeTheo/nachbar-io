import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KantonsSchalter } from "../KantonsSchalter";

describe("KantonsSchalter", () => {
  afterEach(() => cleanup());

  it('zeigt alle 6 curated Kantone plus "Anderer Kanton"', () => {
    render(<KantonsSchalter value="AG" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(["AG", "BL", "BS", "SH", "TG", "ZH", "OTHER"]);
  });

  it("ruft onChange mit neuem Kanton", () => {
    const onChange = vi.fn();
    render(<KantonsSchalter value="AG" onChange={onChange} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "ZH" } });
    expect(onChange).toHaveBeenCalledWith("ZH");
  });

  it('zeigt Sozialamt-Fallback-Link wenn "Anderer Kanton" + otherCanton gesetzt', () => {
    render(
      <KantonsSchalter value="OTHER" onChange={() => {}} otherCanton="VD" />,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    expect(screen.getByText(/Vaud/i)).toBeDefined();
  });
});
