// GET /api/quarters/find-by-location?lat=X&lng=Y
// Geo-basierte Quartier-Zuweisung fuer B2C-Registrierung
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-Client fuer Geo-Queries (umgeht RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(request.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat und lng Parameter erforderlich" },
      { status: 400 }
    );
  }

  // Validierung: Koordinaten im plausiblen Bereich
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Ungueltige Koordinaten" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // 1) Aktives Quartier dessen geo_boundary den Punkt enthaelt?
  const { data: containingQuarter } = await supabase.rpc("find_quarter_containing_point", {
    p_lat: lat,
    p_lng: lng,
  });

  if (containingQuarter && containingQuarter.length > 0) {
    return NextResponse.json({
      quarter_id: containingQuarter[0].id,
      quarter_name: containingQuarter[0].name,
      status: containingQuarter[0].status,
      action: "joined",
    });
  }

  // 2) Keim (seeding) im Umkreis 300m?
  const { data: nearbySeeding } = await supabase.rpc("find_nearest_seeding_quarter", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: 300,
  });

  if (nearbySeeding && nearbySeeding.length > 0) {
    return NextResponse.json({
      quarter_id: nearbySeeding[0].id,
      quarter_name: nearbySeeding[0].name,
      status: nearbySeeding[0].status,
      action: "seeded",
    });
  }

  // 3) Nichts gefunden: Neuen Keim anlegen (200m-Radius)
  const { data: newQuarter, error } = await supabase
    .from("quarters")
    .insert({
      name: `Quartier ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
      status: "seeding",
      center_lat: lat,
      center_lng: lng,
      geo_center: `SRID=4326;POINT(${lng} ${lat})`,
      // geo_boundary wird per Trigger oder hier gesetzt
    })
    .select("id, name, status")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Quartier konnte nicht erstellt werden" },
      { status: 500 }
    );
  }

  // Boundary setzen (200m Kreis)
  await supabase.rpc("set_quarter_boundary_circle", {
    p_quarter_id: newQuarter.id,
    p_radius_m: 200,
  });

  return NextResponse.json({
    quarter_id: newQuarter.id,
    quarter_name: newQuarter.name,
    status: "seeding",
    action: "created",
  }, { status: 201 });
}
