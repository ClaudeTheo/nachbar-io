// app/api/care/household/route.ts
// Nachbar.io — Haushalt-Lookup: household_id fuer einen Bewohner ermitteln

import { NextRequest } from "next/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
} from "@/lib/care/api-helpers";

/**
 * GET /api/care/household?resident_id=...
 * Gibt die household_id zurueck, zu der der angegebene Bewohner gehoert.
 * Nur fuer authentifizierte Caregiver mit aktivem Link zum Bewohner.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse("Nicht autorisiert", 401);
  const { supabase, user } = authResult;

  const residentId = request.nextUrl.searchParams.get("resident_id");
  if (!residentId) {
    return errorResponse("resident_id ist erforderlich", 400);
  }

  // Zugriffspruefung: aktiver Caregiver-Link zum Bewohner
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", user.id)
    .eq("resident_id", residentId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!link) {
    return errorResponse("Kein aktiver Caregiver-Link zu diesem Bewohner", 403);
  }

  // Haushalt des Bewohners ermitteln
  const { data: member, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", residentId)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !member) {
    return errorResponse("Bewohner ist keinem Haushalt zugeordnet", 404);
  }

  return successResponse({ household_id: member.household_id });
}
