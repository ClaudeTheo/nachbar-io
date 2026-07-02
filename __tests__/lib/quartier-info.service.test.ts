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

// Chain-Mocks werden als __areaChain/__wasteChain mit zurueckgegeben, damit
// Tests die Filteraufrufe der Abfuhr-Query (W6, A4:2) assertieren koennen.
type MockChains = {
  __areaChain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
  };
  __wasteChain: {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };
};

function createSupabaseMock(
  municipalConfig: Record<string, unknown> | null,
  cacheRows: Array<{ source: string; data: unknown }> = [],
  waste: {
    areaRows?: Array<{ area_id: string }>;
    wasteRows?: Array<{
      collection_date: string;
      waste_type: string;
      label: string | null;
    }>;
  } = {},
) {
  const areaChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: waste.areaRows ?? [] }),
  };
  const wasteChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: waste.wasteRows ?? [] }),
  };

  return {
    __areaChain: areaChain,
    __wasteChain: wasteChain,
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

      if (table === "quarter_collection_areas") {
        return areaChain;
      }

      if (table === "waste_collection_dates") {
        return wasteChain;
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  } as unknown as SupabaseClient & MockChains;
}

const MINIMAL_CONFIG = {
  city_name: "Bad Säckingen",
  service_links: [],
  apotheken: [],
  events: [],
  oepnv_stops: [],
  notdienst_url: "",
  events_calendar_url: "",
};

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

// W6 (A4:2): Die Abfuhr-Query war ungescoped (jedes Quartier bekam die Termine
// aller Quartiere) und ohne is_cancelled-Filter (abgesagte Termine wurden als
// "Naechste Abfuhr" angezeigt und vorgelesen). Muster: waste-calendar-Seite.
describe("getQuartierInfo — Naechste Abfuhr (W6, A4:2)", () => {
  const AREA_ROWS = [{ area_id: "area-bs" }];
  const WASTE_ROWS = [
    { collection_date: "2099-01-04", waste_type: "bio", label: "Biotonne" },
  ];

  it("scoped die Abfuhr-Termine ueber quarter_collection_areas auf das Quartier", async () => {
    const supabase = createSupabaseMock(MINIMAL_CONFIG, [], {
      areaRows: AREA_ROWS,
      wasteRows: WASTE_ROWS,
    });

    const info = await getQuartierInfo(supabase, "q-bs");

    expect(supabase.__areaChain.eq).toHaveBeenCalledWith("quarter_id", "q-bs");
    expect(supabase.__wasteChain.in).toHaveBeenCalledWith("area_id", ["area-bs"]);
    expect(info.waste_next).toEqual([
      { date: "2099-01-04", type: "bio", label: "Biotonne" },
    ]);
  });

  it("laedt keine abgesagten Termine (is_cancelled-Filter)", async () => {
    const supabase = createSupabaseMock(MINIMAL_CONFIG, [], {
      areaRows: AREA_ROWS,
      wasteRows: WASTE_ROWS,
    });

    await getQuartierInfo(supabase, "q-bs");

    expect(supabase.__wasteChain.eq).toHaveBeenCalledWith("is_cancelled", false);
  });

  it("liefert waste_next leer statt fremder Termine, wenn das Quartier keine Sammelgebiete hat", async () => {
    const supabase = createSupabaseMock(MINIMAL_CONFIG, [], {
      areaRows: [],
      wasteRows: WASTE_ROWS,
    });

    const info = await getQuartierInfo(supabase, "q-ohne-areas");

    expect(info.waste_next).toEqual([]);
    expect(supabase.__wasteChain.select).not.toHaveBeenCalled();
  });
});
