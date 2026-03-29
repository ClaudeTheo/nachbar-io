// GET /api/quarters/find-by-location?lat=X&lng=Y
// Geo-basierte Quartier-Zuweisung fuer B2C-Registrierung
// Business-Logik in quarter-residents.service.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findQuarterByLocation } from "@/lib/services/quarter-residents.service";
import { handleServiceError } from "@/lib/services/service-error";

// Service-Client fuer Geo-Queries (umgeht RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(request.nextUrl.searchParams.get("lng") ?? "");

  const supabase = getServiceClient();

  try {
    const result = await findQuarterByLocation(supabase, lat, lng);
    // "created" gibt 201 zurueck, Rest 200
    const status = result.action === "created" ? 201 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    return handleServiceError(error);
  }
}
