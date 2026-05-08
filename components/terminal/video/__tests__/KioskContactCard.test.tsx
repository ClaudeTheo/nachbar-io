import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import KioskContactCard from "../KioskContactCard";

describe("KioskContactCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert kaputte direkte Props mit stabilen Fallbacks", () => {
    render(
      <KioskContactCard
        name={{ displayName: "Kaputt" } as unknown as string}
        avatar={{ url: "https://example.test/avatar.png" } as unknown as string}
        isOnline={"yes" as unknown as boolean}
        autoAnswerInfo={{ label: "Kaputter Hinweis" } as unknown as string}
        onCall={vi.fn()}
      />,
    );

    expect(screen.getByText("Unbekannter Kontakt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unbekannter Kontakt anrufen" }),
    ).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
