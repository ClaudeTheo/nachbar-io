import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuartierInfo } from "@/lib/services/quartier-info.service";
import { RATHAUS_LINKS } from "@/modules/info-hub/services/rathaus-links";

vi.mock("@/modules/info-hub/services/weather-client", () => ({
  fetchWeather: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/modules/info-hub/services/pollen-client", () => ({
  fetchPollenData: vi.fn().mockResolvedValue(null),
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

function createSupabaseMock(municipalConfig: Record<string, unknown> | null) {
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
          gt: vi.fn().mockResolvedValue({ data: [] }),
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
});
