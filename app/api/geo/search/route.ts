import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/services/geo.service";
import { handleServiceError } from "@/lib/services/service-error";
import { checkEnumeration } from "@/lib/security/traps/enum-detector";
import { buildClientKeysNode } from "@/lib/security/traps/trap-utils";

/**
 * GET /api/geo/search?q=Hauptstraße+Berlin&limit=5
 * Proxy fuer Photon Forward Geocoding — vermeidet CORS/DNS-Probleme im Browser
 */
export async function GET(request: NextRequest) {
  try {
    // Enumeration-Check: Zu viele Geo-Abfragen von derselben IP
    const keys = buildClientKeysNode(request);
    const enumResult = await checkEnumeration(keys, "/api/geo/search");
    if (enumResult.blocked) {
      return NextResponse.json(
        { error: "Zu viele Abfragen. Bitte warten Sie einen Moment." },
        { status: 429 },
      );
    }

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
