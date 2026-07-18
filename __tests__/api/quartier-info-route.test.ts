import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockUnauthorizedResponse = vi.fn(
  () =>
    new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401,
    }),
);
const mockCreateClient = vi.fn();
const mockGetQuartierInfo = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () => mockUnauthorizedResponse(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock("@/lib/services/quartier-info.service", () => ({
  getQuartierInfo: (...args: unknown[]) => mockGetQuartierInfo(...args),
}));

function makeRequest() {
  return new NextRequest("http://localhost/api/quartier-info?quarter_id=q-1");
}

describe("GET /api/quartier-info", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
    mockRequireAuth.mockResolvedValue({
      user: { id: "user-1" },
      supabase: {},
    });
    mockCreateClient.mockReturnValue({ from: vi.fn() });
    mockGetQuartierInfo.mockResolvedValue({ weather: null });
  });

  it("blockiert unauthentifizierte Requests bevor der Service-Role-Client erstellt wird", async () => {
    mockRequireAuth.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockUnauthorizedResponse).toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockGetQuartierInfo).not.toHaveBeenCalled();
  });

  it("liefert Quartier-Info fuer authentifizierte Nutzer", async () => {
    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role",
    );
    expect(mockGetQuartierInfo).toHaveBeenCalledWith(expect.anything(), "q-1");
    await expect(res.json()).resolves.toMatchObject({ weather: null });
  });

  it("normalisiert Listenfelder auf Route-Ebene zu Arrays", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: null,
      nina: { title: "Kaputte Warnung" },
      waste_next: { label: "Kaputter Muellwert" },
      rathaus: { title: "Kaputter Rathauswert" },
      oepnv: [{ name: "Bus", departures: { line: "7310" } }],
      apotheken: { name: "Kaputter Apothekenwert" },
      events: { title: "Kaputter Terminwert" },
      notdienst_url: { href: "https://example.invalid" },
      events_calendar_url: ["https://example.invalid"],
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      weather: null,
      pollen: null,
      waste_next: [],
      rathaus: [],
      oepnv: [],
      apotheken: [],
      events: [],
      notdienst_url: "",
      events_calendar_url: "",
    });
  });

  it("filtert kaputte Rathaus-Link-Eintraege auf Route-Ebene", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: null,
      rathaus: [
        {
          label: "Kaputter Link",
          description: "Ohne URL",
          icon: "landmark",
        },
        {
          label: "Rathaus",
          description: "Kontakt und Oeffnungszeiten",
          url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
          icon: "landmark",
        },
      ],
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      rathaus: [
        {
          label: "Rathaus",
          description: "Kontakt und Oeffnungszeiten",
          url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
          icon: "landmark",
        },
      ],
    });
  });

  it("filtert kaputte Apotheken-Eintraege auf Route-Ebene", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: null,
      apotheken: [
        {
          name: "Kaputte Apotheke",
          address: "Hauptstrasse 1",
          openingHours: "Mo-Fr 08:00-18:00",
        },
        {
          name: "Stadt-Apotheke",
          address: "Hauptstrasse 4",
          phone: "07761 5555",
          openingHours: "Mo-Fr 08:00-18:00",
        },
      ],
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      apotheken: [
        {
          name: "Stadt-Apotheke",
          address: "Hauptstrasse 4",
          phone: "07761 5555",
          openingHours: "Mo-Fr 08:00-18:00",
        },
      ],
    });
  });

  it("filtert kaputte Event-Eintraege auf Route-Ebene", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: null,
      events: [
        {
          title: "Kaputter Termin",
          description: "Ohne Ort",
          schedule: "Sa 10:00 Uhr",
          icon: "calendar",
        },
        {
          title: "Wochenmarkt",
          description: "Frische Lebensmittel aus der Region",
          schedule: "Sa 08:00-12:00 Uhr",
          location: "Marktplatz",
          icon: "calendar",
        },
      ],
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      events: [
        {
          title: "Wochenmarkt",
          description: "Frische Lebensmittel aus der Region",
          schedule: "Sa 08:00-12:00 Uhr",
          location: "Marktplatz",
          icon: "calendar",
        },
      ],
    });
  });

  it("filtert kaputte OePNV-Abfahrten auf Route-Ebene", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: null,
      oepnv: [
        {
          id: "stop-1",
          name: "Bahnhof",
          departures: [
            {
              line: "7310",
              destination: "Waldshut Busbahnhof",
              time: "12:28",
              platform: "14",
              countdown: "5",
            },
            {
              line: "7300",
              destination: "Waldshut Busbahnhof",
              time: "12:30",
              platform: "14",
              countdown: 7,
            },
          ],
        },
      ],
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      oepnv: [
        {
          id: "stop-1",
          name: "Bahnhof",
          departures: [
            {
              line: "7300",
              destination: "Waldshut Busbahnhof",
              time: "12:30",
              platform: "14",
              countdown: 7,
            },
          ],
        },
      ],
    });
  });

  it("filtert kaputte Wetter-Forecast-Eintraege auf Route-Ebene", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: {
        temp: 18,
        description: "sonnig",
        icon: "sun",
        forecast: [
          { day: "Mi", tempMax: "16", icon: "cloud" },
          { day: "Do", tempMax: 12, icon: "rain" },
        ],
      },
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      weather: {
        temp: 18,
        description: "sonnig",
        icon: "sun",
        forecast: [{ day: "Do", tempMax: 12, icon: "rain" }],
      },
    });
  });

  it("filtert Polleneintraege mit ungueltigen Intensitaeten auf Route-Ebene", async () => {
    mockGetQuartierInfo.mockResolvedValueOnce({
      weather: null,
      pollen: {
        region: "Oberrhein",
        pollen: {
          Hasel: { today: 0.5, tomorrow: 1 },
          Birke: { today: 4, tomorrow: 1 },
          Esche: { today: 1.25, tomorrow: 1.5 },
          Graeser: { today: 2, tomorrow: -0.5 },
          Ambrosia: { today: 3, tomorrow: 2.5 },
        },
      },
    });

    const { GET } = await import("@/app/api/quartier-info/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pollen).toEqual({
      region: "Oberrhein",
      pollen: {
        Hasel: { today: 0.5, tomorrow: 1 },
        Ambrosia: { today: 3, tomorrow: 2.5 },
      },
    });
  });
});
