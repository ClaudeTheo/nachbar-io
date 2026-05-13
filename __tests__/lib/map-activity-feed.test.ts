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

  it("wandelt aktive Alerts mit Standort in Warn-Pins um", () => {
    const candidates = mapAlertRowsToActivityCandidates([
      {
        id: "alert-1",
        category: "security",
        title: "Hinweis am Weg",
        description: "Laterne ausgefallen",
        status: "open",
        is_emergency: false,
        location_lat: 47.562348,
        location_lng: 7.945317,
        created_at: "2026-05-13T16:00:00Z",
      },
      {
        id: "alert-no-location",
        category: "security",
        title: "Ohne Standort",
        description: null,
        status: "open",
        is_emergency: false,
        location_lat: null,
        location_lng: null,
        created_at: "2026-05-13T16:05:00Z",
      },
      {
        id: "alert-emergency",
        category: "medical",
        title: "Unfall",
        description: "Akute Lage",
        status: "open",
        is_emergency: true,
        location_lat: 47.562948,
        location_lng: 7.946117,
        created_at: "2026-05-13T16:10:00Z",
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
});
