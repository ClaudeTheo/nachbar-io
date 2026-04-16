import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { ExternalWarningBanner } from "../external-warning-banner";

describe("ExternalWarningBanner", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders nothing when all warning routes are empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<ExternalWarningBanner />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders attribution for a single warning", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "nina-1",
              provider: "nina",
              headline: "Amtliche Warnung",
              description: "Fenster geschlossen halten.",
              instruction: null,
              severity: "moderate",
              sent_at: "2026-04-16T18:00:00.000Z",
              attribution_text:
                "Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)",
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ExternalWarningBanner />);

    expect(await screen.findByText("Amtliche Warnung")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quelle: Bundesamt fuer Bevoelkerungsschutz und Katastrophenhilfe (BBK)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Mehr zu Datenquellen")).toHaveAttribute(
      "href",
      "/datenquellen",
    );
  });

  it("sorts severe warnings before moderate ones", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "nina-1",
              provider: "nina",
              headline: "Severe first",
              description: null,
              instruction: null,
              severity: "severe",
              sent_at: "2026-04-16T18:00:00.000Z",
              attribution_text: "Quelle: BBK",
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "dwd-1",
              provider: "dwd",
              headline: "Moderate second",
              description: null,
              instruction: null,
              severity: "moderate",
              sent_at: "2026-04-16T19:00:00.000Z",
              attribution_text: "Quelle: Deutscher Wetterdienst",
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ExternalWarningBanner />);

    const cards = await screen.findAllByTestId("external-warning-card");

    expect(within(cards[0]!).getByText("Severe first")).toBeInTheDocument();
    expect(within(cards[1]!).getByText("Moderate second")).toBeInTheDocument();
  });
});
