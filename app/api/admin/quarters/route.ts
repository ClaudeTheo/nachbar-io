import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * GET /api/admin/quarters
 * Liste aller Quartiere mit Statistiken.
 * Nur fuer super_admin zugaenglich.
 */
export async function GET() {
  const supabase = await createClient();

  // Auth + Rollen-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Nur Super-Admins" }, { status: 403 });
  }

  // Service-Client fuer cross-quarter Zugriff (umgeht RLS)
  const adminDb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Alle Quartiere laden
  const { data: quarters, error } = await adminDb
    .from("quarters")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats pro Quartier aggregieren
  const quartersWithStats = await Promise.all(
    (quarters ?? []).map(async (q) => {
      const [households, residents, alerts, activeAlerts, helpRequests] = await Promise.all([
        adminDb
          .from("households")
          .select("*", { count: "exact", head: true })
          .eq("quarter_id", q.id),
        // Bewohner ueber household_members zaehlen (users hat kein quarter_id)
        adminDb
          .from("household_members")
          .select("*, households!inner(quarter_id)", { count: "exact", head: true })
          .eq("households.quarter_id", q.id),
        // Alerts im Quartier (letzte 24h, Notfall-Kategorien)
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

  return NextResponse.json(quartersWithStats);
}

/**
 * POST /api/admin/quarters
 * Neues Quartier erstellen.
 * Nur fuer super_admin zugaenglich.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth + Rollen-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Nur Super-Admins" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, city, state: bundesland, description, contact_email,
    center_lat, center_lng, zoom_level,
    bounds_sw_lat, bounds_sw_lng, bounds_ne_lat, bounds_ne_lng,
    invite_prefix, max_households, status: requestedStatus,
    settings: requestedSettings, map_config: requestedMapConfig,
  } = body;

  // Pflichtfelder pruefen
  if (!name || center_lat == null || center_lng == null) {
    return NextResponse.json(
      { error: "Name, center_lat und center_lng sind Pflichtfelder" },
      { status: 400 }
    );
  }

  const lat = typeof center_lat === "number" ? center_lat : parseFloat(center_lat);
  const lng = typeof center_lng === "number" ? center_lng : parseFloat(center_lng);
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Ungueltige Koordinaten" }, { status: 400 });
  }

  // Slug aus Name generieren
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, (c: string) =>
      ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] ?? c)
    )
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // Bounding Box: Vom Client uebernehmen oder ~500m Offset berechnen
  const offset = 0.003;
  const swLat = bounds_sw_lat != null ? Number(bounds_sw_lat) : lat - offset;
  const swLng = bounds_sw_lng != null ? Number(bounds_sw_lng) : lng - offset;
  const neLat = bounds_ne_lat != null ? Number(bounds_ne_lat) : lat + offset;
  const neLng = bounds_ne_lng != null ? Number(bounds_ne_lng) : lng + offset;

  // Status validieren (nur draft oder active erlaubt bei Erstellung)
  const validStatuses = ["draft", "active"];
  const finalStatus = validStatuses.includes(requestedStatus) ? requestedStatus : "draft";

  // Service-Client fuer Insert
  const adminDb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Standard-Settings mit uebergebenen mergen
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
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
