import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/services/geo.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * GET /api/geo/search?q=Hauptstraße+Berlin&limit=5
 * Proxy fuer Photon Forward Geocoding — vermeidet CORS/DNS-Probleme im Browser
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const data = await searchAddress({
      query: searchParams.get("q") ?? "",
      lang: searchParams.get("lang") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
