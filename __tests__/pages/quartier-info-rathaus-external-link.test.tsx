import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";

// Regression-Test fuer 2026-05-09:
// Founder-Meldung "Klick auf Rathaus im Quartier-Menue — kommt nichts".
// Ursache: `app/(app)/quartier-info/page.tsx` rendert Rathaus-Karten als
// rohes `<a target="_blank">`. In PWA-/In-App-Browsern wird das oft
// stillschweigend blockiert. Loesung: SafeExternalLink + Provider-Hinweisdialog.

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

vi.mock("@/modules/voice/components/companion/TTSButton", () => ({
  TTSButton: ({ text }: { text: string }) => (
    <button data-testid="tts-button" data-tts-text={text}>
      Vorlesen
    </button>
  ),
}));

import QuartierInfoPage from "@/app/(app)/quartier-info/page";
import { ExternalLinkProvider } from "@/components/ExternalLinkProvider";

const RATHAUS_LINK = {
  label: "Buergerbuero",
  description: "Anlaufstelle fuer Buerger",
  url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/was-erledige-ich-wo",
  icon: "landmark",
};

const MOCK_DATA = {
  weather: { temp: 18, description: "sonnig", icon: "01d", forecast: [] },
  pollen: null,
  waste_next: [],
  events: [],
  oepnv: [],
  apotheken: [],
  rathaus: [RATHAUS_LINK],
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

describe("QuartierInfoPage Rathaus-Link triggert ExternalLinkProvider", () => {
  it("oeffnet den Hinweisdialog beim Klick auf eine Rathaus-Karte", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(MOCK_DATA),
        ok: true,
      }),
    );

    render(
      <ExternalLinkProvider>
        <QuartierInfoPage />
      </ExternalLinkProvider>,
    );

    // Die Rathaus-Karte erscheint nach dem Daten-Fetch
    const rathausCard = await screen.findByText(RATHAUS_LINK.label);
    expect(rathausCard).toBeDefined();

    // Auf das clickbare Element klicken (Karte oder Eltern-<a>)
    const clickable = rathausCard.closest("a") ?? rathausCard;
    fireEvent.click(clickable);

    // Hinweisdialog "Externe Seite" muss erscheinen — das ist das Verhalten
    // das der ExternalLinkProvider liefert, nicht der rohe target=_blank-Pfad.
    await waitFor(() => {
      expect(screen.getByText(/Externe Seite/i)).toBeDefined();
    });
  });
});
