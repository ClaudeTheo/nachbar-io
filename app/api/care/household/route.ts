// app/api/care/household/route.ts
// Nachbar.io — Haushalt-Lookup: household_id für einen Bewohner ermitteln

import { NextRequest } from "next/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
} from "@/lib/care/api-helpers";
import { getAuthorizedResidentHouseholdId } from "@/lib/care/resident-household.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * GET /api/care/household?resident_id=...
 * Gibt die household_id zurück, zu der der angegebene Bewohner gehört.
 * Nur für authentifizierte Caregiver mit aktivem Link zum Bewohner.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse("Nicht autorisiert", 401);
  const { supabase, user } = authResult;

  const residentId = request.nextUrl.searchParams.get("resident_id");
  if (!residentId) {
    return errorResponse("resident_id ist erforderlich", 400);
  }

  // Zugriffsprüfung: aktiver Caregiver-Link zum Bewohner
  try {
    const householdId = await getAuthorizedResidentHouseholdId(
      supabase,
      user.id,
      residentId,
    );
    return successResponse({ household_id: householdId });
  } catch (error) {
    return handleServiceError(error, request, "/api/care/household");
  }
}
