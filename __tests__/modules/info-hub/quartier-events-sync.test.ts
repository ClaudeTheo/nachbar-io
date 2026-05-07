import { describe, expect, it } from "vitest";
import {
  mapEventRowToLocalEvent,
  mergeQuartierEvents,
  runQuartierEventsSync,
} from "@/modules/info-hub/services/quartier-events-sync.service";

describe("Quartier events sync", () => {
  it("projiziert Events aus der Events-Tabelle in das Quartier-Info-Format", () => {
    expect(
      mapEventRowToLocalEvent(
        {
          id: "evt-1",
          title: "Nachbarschafts-Café",
          description: "Kaffee und Kuchen im Gemeindehaus.",
          event_date: "2026-05-09",
          event_time: "15:00:00",
          end_time: "17:00:00",
          location: "Gemeindehaus",
          category: "community",
        },
        "2026-05-07T10:00:00.000Z",
      ),
    ).toEqual({
      title: "Nachbarschafts-Café",
      description: "Kaffee und Kuchen im Gemeindehaus.",
      schedule: "09.05.2026, 15:00-17:00 Uhr",
      location: "Gemeindehaus",
      icon: "users",
      source: "events-table",
      eventId: "evt-1",
      syncedAt: "2026-05-07T10:00:00.000Z",
    });
  });

  it("bewahrt manuelle Events und ersetzt alte automatische Events", () => {
    const merged = mergeQuartierEvents(
      [
        {
          title: "Manuell gepflegter Markt",
          description: "Bleibt bestehen.",
          schedule: "Jeden Samstag",
          location: "Marktplatz",
          icon: "shopping-bag",
        },
        {
          title: "Alter Auto-Termin",
          description: "Wird ersetzt.",
          schedule: "01.05.2026",
          location: "Alt",
          icon: "calendar",
          source: "events-table",
          eventId: "evt-old",
        },
      ],
      [
        {
          title: "Manuell gepflegter Markt",
          description: "Dublette aus Events-Tabelle",
          schedule: "09.05.2026",
          location: "Marktplatz",
          icon: "calendar",
          source: "events-table",
          eventId: "evt-dup",
          syncedAt: "2026-05-07T10:00:00.000Z",
        },
        {
          title: "Neuer Quartier-Termin",
          description: "Aus der Events-Tabelle.",
          schedule: "10.05.2026",
          location: "Gemeindehaus",
          icon: "users",
          source: "events-table",
          eventId: "evt-new",
          syncedAt: "2026-05-07T10:00:00.000Z",
        },
      ],
    );

    expect(merged).toEqual([
      expect.objectContaining({
        title: "Manuell gepflegter Markt",
        description: "Bleibt bestehen.",
      }),
      expect.objectContaining({
        title: "Neuer Quartier-Termin",
        source: "events-table",
        eventId: "evt-new",
      }),
    ]);
  });

  it("synchronisiert aktive Quartiere in municipal_config.events", async () => {
    const updatePayloads: unknown[] = [];
    const supabase = createSupabaseMock(updatePayloads);

    const result = await runQuartierEventsSync(supabase as never, {
      now: () => new Date("2026-05-07T10:00:00.000Z"),
      today: "2026-05-07",
    });

    expect(result).toMatchObject({
      quarters: 1,
      updated: 1,
      events: 1,
      errors: 0,
    });
    expect(updatePayloads[0]).toMatchObject({
      events: [
        expect.objectContaining({ title: "Manueller Wochenmarkt" }),
        expect.objectContaining({
          title: "Nachbarschafts-Café",
          source: "events-table",
          eventId: "evt-1",
          syncedAt: "2026-05-07T10:00:00.000Z",
        }),
      ],
      sync_meta: {
        apotheken: { status: "ok" },
        events: {
          status: "ok",
          source: "events-table",
          last_synced_at: "2026-05-07T10:00:00.000Z",
          found_count: 2,
          written_count: 1,
          manual_preserved_count: 1,
          error: null,
        },
      },
      updated_at: "2026-05-07T10:00:00.000Z",
    });
  });

  it("schreibt Fehlerstatus in sync_meta.events bei Quartier-Fehlern", async () => {
    const updatePayloads: unknown[] = [];
    const supabase = createSupabaseMock(updatePayloads, { eventError: true });

    const result = await runQuartierEventsSync(supabase as never, {
      now: () => new Date("2026-05-07T11:00:00.000Z"),
      today: "2026-05-07",
    });

    expect(result).toMatchObject({
      quarters: 1,
      updated: 0,
      events: 0,
      errors: 1,
    });
    expect(updatePayloads[0]).toMatchObject({
      sync_meta: {
        apotheken: { status: "ok" },
        events: {
          status: "error",
          source: "events-table",
          last_synced_at: "2026-05-07T11:00:00.000Z",
          found_count: 0,
          written_count: 0,
          manual_preserved_count: 1,
          error: "Events-Lookup fehlgeschlagen",
        },
      },
    });
  });
});

function createSupabaseMock(
  updatePayloads: unknown[],
  options: { eventError?: boolean } = {},
) {
  return {
    from: (table: string) => {
      if (table === "quarters") {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ id: "q1", name: "Pilot" }],
                error: null,
              }),
          }),
        };
      }

      if (table === "municipal_config") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    events: [
                      {
                        title: "Manueller Wochenmarkt",
                        description: "Bleibt kuratiert.",
                        schedule: "Jeden Samstag",
                        location: "Münsterplatz",
                        icon: "shopping-bag",
                      },
                      {
                        title: "Alter Auto-Termin",
                        description: "Wird ersetzt.",
                        schedule: "01.05.2026",
                        location: "Alt",
                        icon: "calendar",
                        source: "events-table",
                        eventId: "evt-old",
                      },
                    ],
                    sync_meta: { apotheken: { status: "ok" } },
                  },
                  error: null,
                }),
            }),
          }),
          update: (payload: unknown) => {
            updatePayloads.push(payload);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }

      if (table === "events") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                order: () => ({
                  limit: () =>
                    options.eventError
                      ? Promise.resolve({
                          data: null,
                          error: { message: "Events-Lookup fehlgeschlagen" },
                        })
                      : Promise.resolve({
                          data: [
                            {
                              id: "evt-1",
                              title: "Nachbarschafts-Café",
                              description: "Kaffee und Kuchen.",
                              event_date: "2026-05-09",
                              event_time: "15:00:00",
                              end_time: "17:00:00",
                              location: "Gemeindehaus",
                              category: "community",
                            },
                            {
                              id: "evt-dup",
                              title: "Manueller Wochenmarkt",
                              description: "Dublette",
                              event_date: "2026-05-10",
                              event_time: null,
                              end_time: null,
                              location: "Münsterplatz",
                              category: "market",
                            },
                          ],
                          error: null,
                        }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}
