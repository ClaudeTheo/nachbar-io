"use client";

import { useEffect, useState } from "react";

import {
  isMapActivityPinColorState,
  isMapActivityPinType,
  type MapActivityPin,
  type MapActivityPinLocationPrecision,
  type MapActivityPinLocationScope,
  type MapActivityPinSource,
  type MapActivityPinUrgency,
  type MapActivityPinVisibility,
} from "@/lib/map-activity-pins";
import { isUserUiMode, type UserUiMode } from "@/lib/user-modes";

interface UseMapActivityPinsOptions {
  mode?: UserUiMode;
  enabled?: boolean;
}

interface UseMapActivityPinsResult {
  pins: MapActivityPin[];
  loading: boolean;
  error: string | null;
}

const LOCATION_PRECISIONS = new Set<MapActivityPinLocationPrecision>([
  "exact",
  "approx_50m",
  "approx_quarter",
]);

const URGENCIES = new Set<MapActivityPinUrgency>([
  "normal",
  "urgent",
  "emergency",
  "status",
]);

const LOCATION_SCOPES = new Set<MapActivityPinLocationScope>([
  "home",
  "meeting_point",
  "quarter_area",
  "external_place",
]);

const VISIBILITIES = new Set<MapActivityPinVisibility>([
  "public",
  "youth_safe",
  "adult",
  "caregiver",
  "own",
]);

const SOURCES = new Set<MapActivityPinSource>([
  "alerts",
  "events",
  "help_requests",
  "youth_tasks",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeMapActivityPin(value: unknown): MapActivityPin | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    !isMapActivityPinType(value.type) ||
    !isFiniteCoordinate(value.lat) ||
    !isFiniteCoordinate(value.lng) ||
    typeof value.title !== "string"
  ) {
    return null;
  }

  const pin: MapActivityPin = {
    id: value.id,
    type: value.type,
    lat: value.lat,
    lng: value.lng,
    title: value.title,
  };

  pin.description = optionalString(value.description);
  pin.approximate = optionalBoolean(value.approximate);
  pin.startsAt = optionalString(value.startsAt);
  pin.href = optionalString(value.href);

  if (
    typeof value.locationPrecision === "string" &&
    LOCATION_PRECISIONS.has(value.locationPrecision as MapActivityPinLocationPrecision)
  ) {
    pin.locationPrecision =
      value.locationPrecision as MapActivityPinLocationPrecision;
  }

  if (
    typeof value.urgency === "string" &&
    URGENCIES.has(value.urgency as MapActivityPinUrgency)
  ) {
    pin.urgency = value.urgency as MapActivityPinUrgency;
  }

  if (isMapActivityPinColorState(value.colorState)) {
    pin.colorState = value.colorState;
  }

  if (
    typeof value.locationScope === "string" &&
    LOCATION_SCOPES.has(value.locationScope as MapActivityPinLocationScope)
  ) {
    pin.locationScope = value.locationScope as MapActivityPinLocationScope;
  }

  if (
    typeof value.visibility === "string" &&
    VISIBILITIES.has(value.visibility as MapActivityPinVisibility)
  ) {
    pin.visibility = value.visibility as MapActivityPinVisibility;
  }

  if (
    typeof value.source === "string" &&
    SOURCES.has(value.source as MapActivityPinSource)
  ) {
    pin.source = value.source as MapActivityPinSource;
  }

  return pin;
}

function buildMapActivityFeedUrl(mode?: UserUiMode): string {
  if (!isUserUiMode(mode)) {
    return "/api/map/activities";
  }

  const params = new URLSearchParams({ mode });
  return `/api/map/activities?${params.toString()}`;
}

export function useMapActivityPins({
  mode,
  enabled = true,
}: UseMapActivityPinsOptions = {}): UseMapActivityPinsResult {
  const [pins, setPins] = useState<MapActivityPin[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPins([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    async function loadPins() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildMapActivityFeedUrl(mode), {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("activity_fetch_failed");
        }

        const data: unknown = await response.json();
        const nextPins = Array.isArray(data)
          ? data.flatMap((item) => {
              const pin = normalizeMapActivityPin(item);
              return pin ? [pin] : [];
            })
          : [];

        if (isActive) {
          setPins(nextPins);
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          return;
        }

        if (isActive) {
          setPins([]);
          setError("activity_fetch_failed");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadPins();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [enabled, mode]);

  return { pins, loading, error };
}
