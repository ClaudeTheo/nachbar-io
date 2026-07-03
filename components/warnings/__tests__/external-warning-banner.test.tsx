import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

  it("zeigt bei Totalausfall der Warnquellen KEINE gruene Entwarnung (W6)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(
      <ExternalWarningBanner emptyState={<span>Alles ruhig</span>} />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    // Promise.allSettled-Kette ausrollen lassen, damit der Endzustand steht
    await act(async () => {
      await Promise.resolve();
    });

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Alles ruhig")).not.toBeInTheDocument();
  });

  it("rendert uebergebene items ohne eigenen Fetch (W6, geteilte Warnquelle)", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ExternalWarningBanner
        items={[
          {
            id: "dwd-1",
            provider: "dwd",
            headline: "Sturmboeen im Landkreis",
            description: null,
            instruction: null,
            severity: "severe",
            sentAt: null,
            expiresAt: null,
            attributionText: "Quelle: Deutscher Wetterdienst (DWD)",
          },
        ]}
      />,
    );

    expect(screen.getByText("Sturmboeen im Landkreis")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("zeigt bei items=[] den emptyState und bei items=null nichts", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { container, rerender } = render(
      <ExternalWarningBanner items={null} emptyState={<span>leer</span>} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <ExternalWarningBanner items={[]} emptyState={<span>leer</span>} />,
    );
    expect(screen.getByText("leer")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("formatiert Warnungs-Zeitstempel mit Rand-Leerzeichen", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "nina-1",
              provider: "nina",
              headline: "Amtliche Warnung",
              description: null,
              instruction: null,
              severity: "moderate",
              sent_at: "  2026-04-16T18:00:00.000Z  ",
              expires_at: "2026-04-17T20:30:00.000Z",
              attribution_text: "Quelle: BBK",
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
    // Founder-Regel 2026-05-11: Bevorzugte Anzeige ist "Gilt bis: ..." (klar
    // dass die Warnung aktiv ist), statt "Aktualisiert: ..." (kann alt wirken).
    expect(screen.getByText("Gilt bis: 17.04., 22:30")).toBeInTheDocument();
    expect(screen.queryByText(/2026-04-16T18:00:00\.000Z/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aktualisiert/)).not.toBeInTheDocument();
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
