import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/services/geo.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * GET /api/geo/reverse?lat=53.5511&lng=9.9937
 * Proxy fuer Photon Reverse Geocoding — gibt Stadt + Stadtteil zurueck
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const data = await reverseGeocode({
      lat: searchParams.get("lat") ?? "",
      lng: searchParams.get("lng") ?? "",
      lang: searchParams.get("lang") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
