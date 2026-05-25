import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BarrierefreiheitPage from "@/app/barrierefreiheit/page";

describe("BarrierefreiheitPage", () => {
  afterEach(() => cleanup());

  it("nennt BFSG, 112/110-Hinweis und aktuellen Pruefstand", () => {
    render(<BarrierefreiheitPage />);

    expect(
      screen.getAllByText(/Barrierefreiheitsstaerkungsgesetz|BFSG/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/112\/110-Hinweis/i)).toBeInTheDocument();
    expect(screen.getByText(/25\. Mai 2026/i)).toBeInTheDocument();
  });
});
