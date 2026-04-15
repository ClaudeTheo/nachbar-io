import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

// Mocks muessen VOR dem Page-Import stehen
const quarterState = vi.hoisted(() => ({
  currentQuarter: {
    id: "q-test-001",
    name: "Test-Quartier",
    center_lat: 47.5535,
    center_lng: 7.964,
    zoom_level: 15,
  },
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

    const btn = screen.getByTestId("tts-button");
    const expectedText = buildDailyBrief(MOCK_DATA);
    expect(btn.getAttribute("data-tts-text")).toBe(expectedText);
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
});
