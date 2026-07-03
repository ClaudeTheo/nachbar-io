// __tests__/app/senior/hier-bei-mir.test.tsx
// Welle S1, Schritt 4 (Befund A4:4): Die Senior-Variante von "Hier bei mir"
// rendert in der (senior)-Shell mit grosser Schrift und fuehrt zurueck zur
// Startseite, statt den Senior in die dichte Standard-UI fallen zu lassen.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Schwere Kind-Komponenten leicht mocken — der Test prueft die Senior-Seite,
// nicht Wetter-/Warnungs-Innereien.
vi.mock("@/components/weather/WeatherWidget", () => ({
  WeatherWidget: () => <div data-testid="weather-mock" />,
}));
vi.mock("@/components/warnings/external-warning-banner", () => ({
  ExternalWarningBanner: ({
    emptyState,
    items,
  }: {
    emptyState?: React.ReactNode;
    items?: unknown[] | null;
  }) => (
    <div
      data-testid="warnings-mock"
      data-items-count={items == null ? "null" : String(items.length)}
    >
      {emptyState}
    </div>
  ),
}));
vi.mock("@/modules/voice/components/companion/TTSButton", () => ({
  TTSButton: () => <button>Vorlesen</button>,
}));
const buildDailyBriefMock = vi.hoisted(() => vi.fn(() => "Tagesüberblick"));
vi.mock("@/modules/voice/services/daily-brief.service", () => ({
  buildDailyBrief: buildDailyBriefMock,
}));
// W6 (A4:3): gemeinsame Warnquelle deterministisch leer mocken —
// der Container reicht sie an Banner und Vorlesen-Brief durch.
vi.mock("@/components/warnings/use-external-warnings", () => ({
  useExternalWarnings: () => ({ warnings: [] }),
}));

const useQuartierInfoMock = vi.fn();
vi.mock("@/modules/info-hub/useQuartierInfo", () => ({
  useQuartierInfo: () => useQuartierInfoMock(),
}));

import SeniorHierBeiMirPage from "@/app/(senior)/hier-bei-mir/page";

afterEach(() => {
  cleanup();
  useQuartierInfoMock.mockReset();
  buildDailyBriefMock.mockClear();
});

const sampleData = {
  weather: { temp: 18, description: "Sonnig", icon: "sun", forecast: [] },
  waste_next: [{ date: "2026-06-15", label: "Restmüll" }],
  oepnv: [
    {
      id: "stop-1",
      name: "Bahnhof",
      departures: [{ time: "10:05", line: "7305", destination: "Waldshut" }],
    },
  ],
  apotheken: [
    {
      name: "Stadt-Apotheke",
      address: "Hauptstr. 1",
      openingHours: "8-18",
      phone: "07761 12345",
    },
  ],
  notdienst_url: "https://example.org/notdienst",
};

describe("Senior /hier-bei-mir (A4:4)", () => {
  it("zeigt die Überschrift und einen Weg zurück zur Startseite", () => {
    useQuartierInfoMock.mockReturnValue({
      currentQuarter: { id: "q1" },
      data: sampleData,
      apiError: null,
      loading: false,
      refresh: vi.fn(),
    });
    render(<SeniorHierBeiMirPage />);

    expect(
      screen.getByRole("heading", { name: /hier bei mir/i }),
    ).toBeInTheDocument();
    const back = screen.getByRole("link", { name: /zur startseite/i });
    expect(back).toHaveAttribute("href", "/kreis-start");
  });

  it("zeigt Müllabfuhr, Apotheke mit Anruf-Knopf und Vorlesen", () => {
    useQuartierInfoMock.mockReturnValue({
      currentQuarter: { id: "q1" },
      data: sampleData,
      apiError: null,
      loading: false,
      refresh: vi.fn(),
    });
    render(<SeniorHierBeiMirPage />);

    expect(screen.getByText(/Restmüll/)).toBeInTheDocument();
    expect(screen.getByText(/Stadt-Apotheke/)).toBeInTheDocument();
    const callLink = screen.getByRole("link", {
      name: /stadt-apotheke anrufen/i,
    });
    expect(callLink).toHaveAttribute("href", "tel:0776112345");
    // 80px Touch-Target fuer den Anruf-Knopf
    expect(callLink.style.minHeight).toBe("80px");
    expect(screen.getByRole("button", { name: /vorlesen/i })).toBeInTheDocument();
  });

  it("uebergibt die Banner-Warnquelle an den Vorlesen-Brief (W6, Ohr = Auge)", () => {
    useQuartierInfoMock.mockReturnValue({
      currentQuarter: { id: "q1" },
      data: sampleData,
      apiError: null,
      loading: false,
      refresh: vi.fn(),
    });
    render(<SeniorHierBeiMirPage />);

    // Brief bekommt dieselbe Warnmenge wie der Banner (items-Prop)
    expect(buildDailyBriefMock).toHaveBeenCalledWith(sampleData, []);
    expect(
      screen.getByTestId("warnings-mock").getAttribute("data-items-count"),
    ).toBe("0");
  });

  it("zeigt einen ruhigen Hinweis, wenn kein Quartier hinterlegt ist", () => {
    useQuartierInfoMock.mockReturnValue({
      currentQuarter: null,
      data: null,
      apiError: null,
      loading: false,
      refresh: vi.fn(),
    });
    render(<SeniorHierBeiMirPage />);

    expect(
      screen.getByRole("heading", { name: /noch kein quartier/i }),
    ).toBeInTheDocument();
  });

  it("zeigt eine verständliche Meldung bei einem Ladefehler", () => {
    useQuartierInfoMock.mockReturnValue({
      currentQuarter: { id: "q1" },
      data: null,
      apiError: "kaputt",
      loading: false,
      refresh: vi.fn(),
    });
    render(<SeniorHierBeiMirPage />);

    expect(screen.getByText(/nicht laden/i)).toBeInTheDocument();
  });
});
