import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BarrierefreiheitPage from "@/app/barrierefreiheit/page";

describe("BarrierefreiheitPage", () => {
  afterEach(() => cleanup());

  it("nennt BFSG-Ausnahme, 112/110-Hinweis und aktuellen Pruefstand", () => {
    render(<BarrierefreiheitPage />);

    expect(
      screen.getAllByText(/Barrierefreiheitsstärkungsgesetz|BFSG/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/§ 3 Abs\. 3 BFSG/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Kleinstunternehmen/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/freiwillig/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Landesverwaltungsamt Sachsen-Anhalt/i)).not.toBeInTheDocument();
    expect(screen.getByText(/112\/110-Hinweis/i)).toBeInTheDocument();
    expect(screen.getByText(/25\. Mai 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Stand: Mai 2026/i)).toBeInTheDocument();
  });
});
