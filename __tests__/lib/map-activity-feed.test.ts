import { describe, expect, it } from "vitest";

import {
  filterMapActivityFeedForContext,
  mapAlertRowsToActivityCandidates,
  resolveMapActivityMode,
  type MapActivityFeedCandidate,
} from "@/lib/map-activity-feed";

const baseCandidate: MapActivityFeedCandidate = {
  id: "candidate-1",
  type: "meeting",
  lat: 47.562348,
  lng: 7.945317,
  title: "Quartier-Treff",
  locationPrecision: "approx_50m",
  urgency: "normal",
  colorState: "green",
  locationScope: "meeting_point",
  visibility: "public",
  source: "events",
};

describe("map activity feed", () => {
  it("erzwingt den Jugendmodus fuer Jugend-Profile", () => {
    expect(resolveMapActivityMode("active", "youth")).toBe("youth");
    expect(resolveMapActivityMode("comfort", "youth")).toBe("youth");
    expect(resolveMapActivityMode("senior", "youth")).toBe("youth");
  });

  it("verhindert, dass Erwachsene per Query in den Jugendmodus wechseln", () => {
    expect(resolveMapActivityMode("youth", "active")).toBe("active");
    expect(resolveMapActivityMode("youth", "comfort")).toBe("comfort");
    expect(resolveMapActivityMode("youth", "senior")).toBe("senior");
  });

  it("filtert Jugendfeeds auf oeffentliche und jugendsichere Pins", () => {
    const feed = filterMapActivityFeedForContext(
      [
        {
          ...baseCandidate,
          id: "youth-safe",
          title: "Lerngruppe",
          visibility: "youth_safe",
        },
        {
          ...baseCandidate,
          id: "adult-help",
          title: "Private Hilfe",
          visibility: "adult",
        },
        {
          ...baseCandidate,
          id: "care-pin",
          title: "Care-Aufgabe",
          visibility: "caregiver",
        },
      ],
      { mode: "youth", userId: "u-youth", role: "resident" },
    );

    expect(feed.map((pin) => pin.id)).toEqual(["youth-safe"]);
    expect(JSON.stringify(feed)).not.toMatch(/Private Hilfe|Care-Aufgabe/);
  });

  it("rundet nicht-exakte Standorte, bevor sie an den Client gehen", () => {
    const [pin] = filterMapActivityFeedForContext([baseCandidate], {
      mode: "active",
      userId: "u-active",
      role: "resident",
    });

    expect(pin.locationPrecision).toBe("approx_50m");
    expect(pin.approximate).toBe(true);
    expect(pin.urgency).toBe("normal");
    expect(pin.colorState).toBe("green");
    expect(pin.locationScope).toBe("meeting_point");
    expect(pin.lat).toBe(47.562);
    expect(pin.lng).toBe(7.945);
  });

  it("zeigt eigene Pins nur dem passenden Nutzer", () => {
    const ownPin: MapActivityFeedCandidate = {
      ...baseCandidate,
      id: "own-pin",
      visibility: "own",
      ownerUserId: "u-owner",
    };

    expect(
      filterMapActivityFeedForContext([ownPin], {
        mode: "active",
        userId: "u-owner",
        householdId: "hh-other",
        role: "resident",
      }),
    ).toHaveLength(1);
    expect(
      filterMapActivityFeedForContext([ownPin], {
        mode: "active",
        userId: "u-other",
        role: "resident",
      }),
    ).toHaveLength(0);
  });

  it("zeigt haushaltsverankerte Pins nur dem eigenen Haushalt exakt", () => {
    const ownHomePin: MapActivityFeedCandidate = {
      ...baseCandidate,
      id: "own-home-pin",
      locationPrecision: "exact",
      locationScope: "home",
      exactForOwnerOnly: true,
      ownerUserId: "u-owner",
      householdId: "hh-1",
    };

    const [ownPin] = filterMapActivityFeedForContext([ownHomePin], {
      mode: "active",
      userId: "u-household-member",
      householdId: "hh-1",
      role: "resident",
    });
    const [publicPin] = filterMapActivityFeedForContext([ownHomePin], {
      mode: "active",
      userId: "u-neighbor",
      householdId: "hh-2",
      role: "resident",
    });

    expect(ownPin).toEqual(
      expect.objectContaining({
        lat: 47.562348,
        lng: 7.945317,
        locationPrecision: "exact",
        approximate: false,
      }),
    );
    expect(publicPin).toEqual(
      expect.objectContaining({
        lat: 47.562,
        lng: 7.945,
        locationPrecision: "approx_50m",
        approximate: true,
      }),
    );
  });

  it("wandelt aktive Alerts mit Standort in Warn-Pins um", () => {
    const candidates = mapAlertRowsToActivityCandidates([
      {
        id: "alert-1",
        user_id: "u-1",
        household_id: "hh-1",
        category: "security",
        title: "Hinweis am Weg",
        description: "Laterne ausgefallen",
        status: "open",
        is_emergency: false,
        location_lat: 47.562348,
        location_lng: 7.945317,
        location_source: "gps",
        created_at: "2026-05-13T16:00:00Z",
        household: null,
      },
      {
        id: "alert-no-location",
        user_id: "u-1",
        household_id: "hh-1",
        category: "security",
        title: "Ohne Standort",
        description: null,
        status: "open",
        is_emergency: false,
        location_lat: null,
        location_lng: null,
        location_source: null,
        created_at: "2026-05-13T16:05:00Z",
        household: null,
      },
      {
        id: "alert-emergency",
        user_id: "u-2",
        household_id: "hh-2",
        category: "medical",
        title: "Unfall",
        description: "Akute Lage",
        status: "open",
        is_emergency: true,
        location_lat: 47.562948,
        location_lng: 7.946117,
        location_source: "gps",
        created_at: "2026-05-13T16:10:00Z",
        household: null,
      },
    ]);

    expect(candidates).toEqual([
      expect.objectContaining({
        id: "alert-alert-1",
        type: "warning",
        title: "Hinweis am Weg",
        description: "Laterne ausgefallen",
        locationPrecision: "approx_50m",
        urgency: "urgent",
        colorState: "yellow",
        locationScope: "quarter_area",
        visibility: "public",
        source: "alerts",
      }),
      expect.objectContaining({
        id: "alert-alert-emergency",
        type: "warning",
        urgency: "emergency",
        colorState: "red",
        locationScope: "quarter_area",
      }),
    ]);
  });

  it("verankert Stromausfaelle am Haushalts-Punkt statt am ungenauen Geraetestandort", () => {
    const candidates = mapAlertRowsToActivityCandidates([
      {
        id: "power-1",
        user_id: "u-1",
        household_id: "hh-1",
        category: "power_outage",
        title: "Stromausfall",
        description: "Sicherung ist raus",
        status: "open",
        is_emergency: false,
        location_lat: 47.553999,
        location_lng: 7.964999,
        location_source: "gps",
        created_at: "2026-05-16T09:00:00Z",
        household: { lat: 47.553512, lng: 7.964123 },
      },
    ]);

    expect(candidates).toEqual([
      expect.objectContaining({
        id: "alert-power-1",
        lat: 47.553512,
        lng: 7.964123,
        locationPrecision: "exact",
        locationScope: "home",
        approximate: false,
        exactForOwnerOnly: true,
        ownerUserId: "u-1",
        householdId: "hh-1",
      }),
    ]);
  });
});
