import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExternalLink } from "@/components/ExternalLink";
import { ExternalLinkProvider } from "@/components/ExternalLinkProvider";

describe("ExternalLink", () => {
  afterEach(() => cleanup());

  it("rendert externe Ziele als echte Links mit href", () => {
    render(
      <ExternalLink href="https://www.bad-saeckingen.de/buergerbuero">
        Bürgerbüro
      </ExternalLink>,
    );

    expect(screen.getByRole("link", { name: "Bürgerbüro" })).toHaveAttribute(
      "href",
      "https://www.bad-saeckingen.de/buergerbuero",
    );
  });

  it("zeigt mit Provider vor dem Oeffnen den externen Hinweisdialog", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <ExternalLinkProvider>
        <ExternalLink href="https://www.bad-saeckingen.de/buergerbuero">
          Bürgerbüro
        </ExternalLink>
      </ExternalLinkProvider>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Bürgerbüro" }));

    expect(screen.getByText("Externe Seite")).toBeInTheDocument();
    expect(screen.getByText("bad-saeckingen.de")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /oeffnen|öffnen/i }));
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.bad-saeckingen.de/buergerbuero",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
  });
});
