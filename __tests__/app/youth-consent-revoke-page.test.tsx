import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WiderrufSeite from "@/app/jugend/freigabe/widerruf/page";

describe("Jugendfreigabe Widerruf", () => {
  afterEach(() => cleanup());

  it("erklaert den sicheren Widerruf ohne offene Telefonnummer-Eingabe", () => {
    render(<WiderrufSeite />);

    expect(
      screen.getByText(/nicht allein ueber eine frei eingegebene Telefonnummer/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Widerruf per E-Mail starten/i }),
    ).toHaveAttribute("href", expect.stringContaining("mailto:"));
    expect(
      screen.getByText(/mit Wirkung fuer die Zukunft widerrufen/i),
    ).toBeInTheDocument();
  });
});
