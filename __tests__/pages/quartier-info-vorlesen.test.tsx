import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// Mocks muessen VOR dem Page-Import stehen
// Explicit nullable-Typ: "kein Quartier zugeordnet"-Test (Zeile ~170)
// weist currentQuarter = null zu, muss also im State-Typ erlaubt sein.
type QuarterMock = {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  zoom_level: number;
};
const quarterState = vi.hoisted(() => ({
  currentQuarter: {
    id: "q-test-001",
    name: "Test-Quartier",
    center_lat: 47.5535,
    center_lng: 7.964,
    zoom_level: 15,
  } as QuarterMock | null,
  loading: false,
  refreshQuarter: vi.fn(),
  switchQuarter: vi.fn(),
  allQuarters: [],
}));

vi.mock("@/lib/quarters", () => ({
  useQuarter: () => quarterState,
}));

vi.mock("@/components/map/MapThumbnail", () => ({
  MapThumbnail: ({ label }: { label?: string }) => (
    <div data-testid="info-map-thumbnail">{label}</div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/weather/WeatherWidget", () => ({
  WeatherWidget: () => <div data-testid="weather-widget" />,
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} data-testid="skeleton" />
  ),
}));

vi.mock("@/components/ui/LargeTitle", () => ({
  LargeTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// TTSButton mocken — wir pruefen nur dass er mit dem richtigen Text gerendert wird
vi.mock("@/modules/voice/components/companion/TTSButton", () => ({
  TTSButton: ({ text }: { text: string }) => (
    <button data-testid="tts-button" data-tts-text={text}>
      Vorlesen
    </button>
  ),
}));

import QuartierInfoPage from "@/app/(app)/quartier-info/page";
import { buildDailyBrief } from "@/modules/voice/services/daily-brief.service";

const MOCK_DATA = {
  weather: { temp: 18, description: "sonnig", icon: "01d", forecast: [] },
  pollen: {
    region: "Test",
    pollen: {
      Birke: {
        today: 2.0 as 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3,
        tomorrow: 1.0 as 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3,
      },
    },
  },
  nina: [],
  waste_next: [{ date: "2026-04-15", type: "restmuell", label: "Restmuell" }],
  events: [
    {
      title: "Wochenmarkt",
      description: "Frische Waren aus der Region",
      schedule: "Mi 8-12 Uhr",
      location: "Muensterplatz",
      icon: "calendar",
    },
  ],
  oepnv: [],
  apotheken: [],
  rathaus: [],
  notdienst_url: "",
  events_calendar_url: "",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  quarterState.currentQuarter = {
    id: "q-test-001",
    name: "Test-Quartier",
    center_lat: 47.5535,
    center_lng: 7.964,
    zoom_level: 15,
  };
  quarterState.loading = false;
  quarterState.refreshQuarter.mockReset();
});

describe("QuartierInfoPage Vorlesen-Integration (G-5)", () => {
  it("rendert den Vorlesen-Button mit buildDailyBrief-Text wenn Daten geladen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_DATA),
        ok: true,
      }),
    );

    render(<QuartierInfoPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tts-button")).toBeInTheDocument();
    });

    // W6: Der Warnungs-Teil kommt aus der Banner-Quelle (/api/warnings/*).
    // Der pauschale fetch-Mock liefert dort MOCK_DATA (kein Array) -> [] —
    // also auf den Endzustand mit geladener Warnquelle warten.
    const expectedText = buildDailyBrief(MOCK_DATA, []);
    await waitFor(() => {
      expect(
        screen.getByTestId("tts-button").getAttribute("data-tts-text"),
      ).toBe(expectedText);
    });
  });

  it("liest dieselben Warnungen vor, die der Banner zeigt (W6, Ohr = Auge)", async () => {
    const dwdWarning = {
      id: "dwd-1",
      provider: "dwd",
      headline: "Sturmboeen im Landkreis Waldshut",
      description: null,
      instruction: null,
      severity: "severe",
      sent_at: "2026-07-01T10:00:00.000Z",
      expires_at: null,
      attribution_text: "Quelle: Deutscher Wetterdienst (DWD)",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/warnings/dwd")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([dwdWarning]),
          });
        }
        if (url.includes("/api/warnings/")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_DATA),
        });
      }),
    );

    render(<QuartierInfoPage />);

    // Auge: der Banner zeigt die DWD-Warnung
    expect(
      await screen.findByText("Sturmboeen im Landkreis Waldshut"),
    ).toBeInTheDocument();

    // Ohr: der Vorlesen-Text enthaelt dieselbe Warnung — obwohl data.nina leer ist
    await waitFor(() => {
      const ttsText =
        screen.getByTestId("tts-button").getAttribute("data-tts-text") ?? "";
      expect(ttsText).toContain("Sturmboeen im Landkreis Waldshut");
      expect(ttsText).not.toContain("Es liegen gerade keine Warnungen vor");
    });
  });

  it("sagt 'keine Daten' statt 'keine Warnungen', solange die Warnquelle nicht geantwortet hat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/warnings/")) {
          return new Promise(() => {}); // Warnquelle haengt absichtlich
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_DATA),
        });
      }),
    );

    render(<QuartierInfoPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tts-button")).toBeInTheDocument();
    });

    const ttsText =
      screen.getByTestId("tts-button").getAttribute("data-tts-text") ?? "";
    expect(ttsText).toContain("Zu Warnungen habe ich gerade keine Daten");
    expect(ttsText).not.toContain("Es liegen gerade keine Warnungen vor");
  });

  it("zeigt keinen Vorlesen-Button waehrend des Ladens", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {})), // haengt absichtlich
    );

    render(<QuartierInfoPage />);
    expect(screen.queryByTestId("tts-button")).not.toBeInTheDocument();
  });

  it("TTSButton-Text enthaelt alle Sektionen aus dem Brief", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_DATA),
        ok: true,
      }),
    );

    render(<QuartierInfoPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tts-button")).toBeInTheDocument();
    });

    const text =
      screen.getByTestId("tts-button").getAttribute("data-tts-text") ?? "";
    expect(text).toContain("sonnig");
    expect(text).toContain("18 Grad");
    expect(text).toContain("Birke");
    expect(text).toContain("Restmuell");
    expect(text).toContain("Wochenmarkt");
  });

  it("zeigt einen klaren Fallback wenn kein Quartier zugeordnet ist", async () => {
    quarterState.currentQuarter = null;
    quarterState.loading = false;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<QuartierInfoPage />);

    expect(await screen.findByTestId("info-no-quarter")).toBeInTheDocument();
    expect(screen.queryByTestId("info-map-thumbnail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tts-button")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rendert keine leeren externen Links wenn Notdienst- oder Event-URLs fehlen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_DATA),
        ok: true,
      }),
    );

    render(<QuartierInfoPage />);

    expect(
      await screen.findByTestId("info-notdienst-unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("info-events-calendar-unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /notdienst jetzt prüfen/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /alle veranstaltungen anzeigen/i }),
    ).not.toBeInTheDocument();
  });

  it("zeigt klare Leerstates fuer Apotheken und Veranstaltungen", async () => {
    const emptySectionData = {
      ...MOCK_DATA,
      apotheken: [],
      events: [],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(emptySectionData),
        ok: true,
      }),
    );

    render(<QuartierInfoPage />);

    expect(await screen.findByTestId("info-apotheken-empty")).toHaveTextContent(
      /keine apothekeninformationen hinterlegt/i,
    );
    expect(await screen.findByTestId("info-events-empty")).toHaveTextContent(
      /keine veranstaltungen hinterlegt/i,
    );
  });

  it("rendert fuer Apotheken echte Telefon- und Kartenlinks", async () => {
    const pharmacyData = {
      ...MOCK_DATA,
      apotheken: [
        {
          name: "Stadt-Apotheke",
          address: "Muensterplatz 1, 79713 Bad Saeckingen",
          phone: "+49 7761 12345",
          openingHours: "Mo-Fr 8-18 Uhr",
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(pharmacyData),
        ok: true,
      }),
    );

    render(<QuartierInfoPage />);

    expect(
      await screen.findByRole("link", { name: "Stadt-Apotheke anrufen" }),
    ).toHaveAttribute("href", "tel:+49776112345");

    expect(
      screen.getByRole("link", { name: "Stadt-Apotheke auf Karte anzeigen" }),
    ).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/search?query=Stadt-Apotheke%20Muensterplatz%201%2C%2079713%20Bad%20Saeckingen",
    );
  });

  it("normalisiert kaputte API-Listen vor UI und Vorlesen", async () => {
    const malformedListData = {
      ...MOCK_DATA,
      nina: { headline: "Kaputte Warnliste" },
      waste_next: { label: "Kaputter Muellwert" },
      rathaus: { label: "Kaputter Rathauswert" },
      oepnv: { id: "Kaputter Haltestellenwert" },
      apotheken: { name: "Kaputter Apothekenwert" },
      events: { title: "Kaputter Veranstaltungswert" },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(malformedListData),
        ok: true,
      }),
    );

    render(<QuartierInfoPage />);

    expect(await screen.findByTestId("info-apotheken-empty")).toHaveTextContent(
      /keine apothekeninformationen hinterlegt/i,
    );
    expect(screen.getByTestId("info-events-empty")).toHaveTextContent(
      /keine veranstaltungen hinterlegt/i,
    );

    const ttsText =
      screen.getByTestId("tts-button").getAttribute("data-tts-text") ?? "";
    expect(ttsText).toContain("Zur Muellabfuhr habe ich gerade keine Daten.");
    expect(ttsText).toContain("Zu Veranstaltungen habe ich gerade keine Daten.");
  });

  it("zeigt API-Fehler nicht als leere Quartierdaten", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            error:
              "Der QuartierApp-Pilot ist geschlossen und nimmt aktuell keine Anmeldungen oder personenbezogenen Daten an.",
            status: "closed_pilot",
          }),
      }),
    );

    render(<QuartierInfoPage />);

    expect(await screen.findByTestId("info-api-error")).toHaveTextContent(
      /pilot ist geschlossen/i,
    );
    expect(screen.queryByTestId("info-apotheken-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("info-events-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tts-button")).not.toBeInTheDocument();
  });
});
