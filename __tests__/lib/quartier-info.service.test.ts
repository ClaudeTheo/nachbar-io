import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuartierInfo } from "@/lib/services/quartier-info.service";
import { RATHAUS_LINKS } from "@/modules/info-hub/services/rathaus-links";
import { fetchPollenData } from "@/modules/info-hub/services/pollen-client";

vi.mock("@/modules/info-hub/services/weather-client", () => ({
  fetchWeather: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/info-hub/services/pollen-client", () => ({
  fetchPollenData: vi.fn().mockResolvedValue(null),
  isLegacyDefaultPollenRegion: (value: unknown) =>
    Boolean(
      value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof (value as { region?: unknown }).region === "string" &&
        (value as { region: string }).region.toLowerCase().includes("hohenlohe"),
    ),
}));

vi.mock("@/modules/info-hub/services/nina-client", () => ({
  fetchNinaWarnings: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/modules/info-hub/services/oepnv-client", () => ({
  fetchDepartures: vi.fn().mockResolvedValue({
    id: "stop-1",
    name: "Test-Haltestelle",
    departures: [],
  }),
}));

function createSupabaseMock(
  municipalConfig: Record<string, unknown> | null,
  cacheRows: Array<{ source: string; data: unknown }> = [],
) {
  return {
    from: vi.fn((table: string) => {
      if (table === "municipal_config") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: municipalConfig }),
        };
      }

      if (table === "quartier_info_cache") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({ data: cacheRows }),
        };
      }

      if (table === "quarters") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { settings: {} } }),
        };
      }

      if (table === "waste_collection_dates") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient;
}

describe("getQuartierInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPollenData).mockResolvedValue(null);
  });

  it("nutzt kuratierte Bad-Saeckingen-Rathauslinks, wenn municipal_config leer ist", async () => {
    const supabase = createSupabaseMock({
      city_name: "Bad Säckingen",
      service_links: [],
      apotheken: [],
      events: [],
      oepnv_stops: [],
      notdienst_url: "",
      events_calendar_url: "",
    });

    await expect(getQuartierInfo(supabase, "q-bs")).resolves.toMatchObject({
      rathaus: RATHAUS_LINKS,
    });
  });

  it("laesst leere Rathauslinks fuer andere Staedte leer", async () => {
    const supabase = createSupabaseMock({
      city_name: "Laufenburg (Baden)",
      service_links: [],
      apotheken: [],
      events: [],
      oepnv_stops: [],
      notdienst_url: "",
      events_calendar_url: "",
    });

    await expect(getQuartierInfo(supabase, "q-lf")).resolves.toMatchObject({
      rathaus: [],
    });
  });

  it("baut Rathauslinks aus rathaus_url, wenn keine Service-Links gepflegt sind", async () => {
    const supabase = createSupabaseMock({
      city_name: "Laufenburg (Baden)",
      rathaus_url: "https://www.laufenburg.de/",
      service_links: [],
      apotheken: [],
      events: [],
      oepnv_stops: [],
      notdienst_url: "",
      events_calendar_url: "",
    });

    await expect(getQuartierInfo(supabase, "q-lf")).resolves.toMatchObject({
      rathaus: [
        {
          label: "Rathaus Laufenburg (Baden)",
          url: "https://www.laufenburg.de",
          icon: "building",
          category: "kontakt",
        },
        {
          label: "Bürgerbüro",
          url: "https://www.laufenburg.de/buergerbuero",
          icon: "users",
          category: "kontakt",
        },
        {
          label: "Formulare & Anträge",
          url: "https://www.laufenburg.de/formulare",
          icon: "clipboard",
          category: "formulare",
        },
        {
          label: "Veranstaltungskalender",
          url: "https://www.laufenburg.de/veranstaltungen",
          icon: "calendar",
          category: "service",
        },
        {
          label: "Abfallwirtschaft",
          url: "https://www.laufenburg.de/abfall",
          icon: "trash",
          category: "service",
        },
      ],
    });
  });

  it("behandelt nicht-array service_links wie leer und nutzt Rathaus-URL-Defaults", async () => {
    const supabase = createSupabaseMock({
      city_name: "Laufenburg (Baden)",
      rathaus_url: "https://www.laufenburg.de/",
      service_links: { label: "Kaputter JSONB-Wert" },
      apotheken: [],
      events: [],
      oepnv_stops: [],
      notdienst_url: "",
      events_calendar_url: "",
    });

    const info = await getQuartierInfo(supabase, "q-lf");

    expect(info.rathaus[0]).toMatchObject({
      label: "Rathaus Laufenburg (Baden)",
      url: "https://www.laufenburg.de",
    });
    expect(info.rathaus).toHaveLength(5);
  });

  it("gibt municipal_config Listen auch bei nicht-array JSONB als Arrays zurueck", async () => {
    const supabase = createSupabaseMock({
      city_name: "Laufenburg (Baden)",
      rathaus_url: "https://www.laufenburg.de/",
      service_links: [],
      apotheken: { name: "Kaputter Apotheken-Wert" },
      events: { title: "Kaputter Event-Wert" },
      oepnv_stops: { id: "stop-1", name: "Kaputter Haltestellen-Wert" },
      notdienst_url: "",
      events_calendar_url: "",
    });

    const info = await getQuartierInfo(supabase, "q-lf");

    expect(info.apotheken).toEqual([]);
    expect(info.events).toEqual([]);
    expect(info.oepnv).toEqual([]);
  });

  it("ueberschreibt vorhandene Rathauslinks aus municipal_config nicht", async () => {
    const configuredLink = {
      label: "Kontakt",
      description: "Direkter Kontakt aus der Quartier-Konfiguration",
      url: "https://www.bad-saeckingen.de/kontakt",
      icon: "building",
    };
    const supabase = createSupabaseMock({
      city_name: "Bad Saeckingen",
      service_links: [configuredLink],
      apotheken: [],
      events: [],
      oepnv_stops: [],
      notdienst_url: "",
      events_calendar_url: "",
    });

    await expect(getQuartierInfo(supabase, "q-bs")).resolves.toMatchObject({
      rathaus: [
        {
          ...configuredLink,
          url: "https://www.bad-saeckingen.de/rathaus-service/buergerservice/kontakt-oeffnungszeiten",
        },
      ],
    });
  });

  it("ignoriert alte Hohenlohe-Pollen-Cacheeintraege nach der Bad-Saeckingen-Regionkorrektur", async () => {
    vi.mocked(fetchPollenData).mockResolvedValue({
      region: "Mittelgebirge Baden-Wuerttemberg",
      pollen: {
        Graeser: { today: 1, tomorrow: 0 },
      },
    });

    const supabase = createSupabaseMock(
      {
        city_name: "Bad Säckingen",
        service_links: [],
        apotheken: [],
        events: [],
        oepnv_stops: [],
        notdienst_url: "",
        events_calendar_url: "",
      },
      [
        {
          source: "pollen",
          data: {
            region: "Hohenlohe/mittlerer Neckar/Oberschwaben",
            pollen: {
              Graeser: { today: 3, tomorrow: 2 },
            },
          },
        },
      ],
    );

    await expect(getQuartierInfo(supabase, "q-bs")).resolves.toMatchObject({
      pollen: {
        region: "Mittelgebirge Baden-Wuerttemberg",
      },
    });
    expect(fetchPollenData).toHaveBeenCalledOnce();
  });
});
