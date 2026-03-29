// Nachbar.io — Service: Admin-Quartierliste + Quartiererstellung
// Extrahiert aus app/api/admin/quarters/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

export interface CreateQuarterInput {
  name: string;
  city?: string;
  state?: string;
  description?: string;
  contact_email?: string;
  center_lat: number | string;
  center_lng: number | string;
  zoom_level?: number | string;
  bounds_sw_lat?: number | string;
  bounds_sw_lng?: number | string;
  bounds_ne_lat?: number | string;
  bounds_ne_lng?: number | string;
  invite_prefix?: string;
  max_households?: number | string;
  status?: string;
  settings?: Record<string, unknown>;
  map_config?: Record<string, unknown>;
}

/**
 * Alle Quartiere mit aggregierten Statistiken laden.
 */
export async function listQuartersWithStats(adminDb: SupabaseClient) {
  const { data: quarters, error } = await adminDb
    .from("quarters")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  const quartersWithStats = await Promise.all(
    (quarters ?? []).map(async (q) => {
      const [households, residents, alerts, activeAlerts, helpRequests] = await Promise.all([
        adminDb
          .from("households")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", q.id),
        // Bewohner über household_members zählen (users hat kein quarter_id)
        adminDb
          .from("household_members")
          .select("*, households!inner(quarter_id)", { count: "exact", head: true })
          .eq("households.quarter_id", q.id),
        // Alerts im Quartier (letzte 24h)
        adminDb
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", q.id)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        // Alle aktiven Alerts im Quartier
        adminDb
          .from("alerts")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", q.id)
          .eq("status", "active"),
        adminDb
          .from("help_requests")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", q.id)
          .eq("status", "active"),
      ]);

      return {
        ...q,
        stats: {
          householdCount: households.count ?? 0,
          residentCount: residents.count ?? 0,
          activeAlerts: alerts.count ?? 0,
          activePosts: activeAlerts.count ?? 0,
          helpRequests: helpRequests.count ?? 0,
        },
      };
    })
  );

  return quartersWithStats;
}

/**
 * Neues Quartier erstellen.
 */
export async function createQuarter(
  adminDb: SupabaseClient,
  userId: string,
  body: CreateQuarterInput
) {
  const {
    name, city, state: bundesland, description, contact_email,
    center_lat, center_lng, zoom_level,
    bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng,
    invite_prefix, max_households, status: requestedStatus,
    settings: requestedSettings, map_config: requestedMapConfig,
  } = body;

  // Pflichtfelder prüfen
  if (!name || center_lat == null || center_lng == null) {
    throw new ServiceError("Name, center_lat und center_lng sind Pflichtfelder", 400);
  }

  const lat = typeof center_lat === "number" ? center_lat : parseFloat(center_lat);
  const lng = typeof center_lng === "number" ? center_lng : parseFloat(center_lng);
  if (isNaN(lat) || isNaN(lng)) {
    throw new ServiceError("Ungültige Koordinaten", 400);
  }

  // Slug aus Name generieren (mit Umlaut-Ersetzung)
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (c: string) =>
      ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] ?? c)
    )
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Bounding Box: Vom Client übernehmen oder ~500m Offset berechnen
  const offset = 0.003;
  const swLat = bounds_sw_lat != null ? Number(bounds_sw_lat) : lat - offset;
  const swLng = bounds_sw_lng != null ? Number(bounds_sw_lng) : lng - offset;
  const neLat = bounds_ne_lat != null ? Number(bounds_ne_lat) : lat + offset;
  const neLng = bounds_ne_lng != null ? Number(bounds_ne_lng) : lng + offset;

  // Status validieren (nur draft oder active erlaubt bei Erstellung)
  const validStatuses = ["draft", "active"];
  const finalStatus = validStatuses.includes(requestedStatus ?? "") ? requestedStatus : "draft";

  // Standard-Settings mit übergebenen mergen
  const defaultSettings = {
    allowSelfRegistration: false,
    requireVerification: true,
    enableCareModule: false,
    enableMarketplace: true,
    enableEvents: true,
    enablePolls: true,
    emergencyBannerEnabled: true,
    maxMembersPerHousehold: 8,
    defaultLanguage: "de",
  };

  const { data: created, error } = await adminDb
    .from("quarters")
    .insert({
      name: name.trim(),
      slug,
      city: city?.trim() || null,
      state: bundesland?.trim() || null,
      description: description?.trim() || null,
      contact_email: contact_email?.trim() || null,
      center_lat: lat,
      center_lng: lng,
      zoom_level: zoom_level != null ? Number(zoom_level) : 17,
      bounds_sw_lat: swLat,
      bounds_sw_lng: swLng,
      bounds_ne_lat: neLat,
      bounds_ne_lng: neLng,
      status: finalStatus,
      invite_prefix: invite_prefix?.trim() || null,
      max_households: max_households ? Number(max_households) : 50,
      settings: requestedSettings
        ? { ...defaultSettings, ...requestedSettings }
        : defaultSettings,
      map_config: requestedMapConfig ?? { type: "leaflet" },
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  return created;
}
