import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getHouseNumbersByStreet } from "@/lib/services/household.service";

/**
 * GET /api/households/by-street?street=Purkersdorfer+Straße
 *
 * Gibt alle Hausnummern für eine Straße zurück.
 * Wird im Registrierungsformular für Autocomplete verwendet.
 * Verwendet Service-Role um RLS zu umgehen (unangemeldete Nutzer).
 */
export async function GET(request: NextRequest) {
  const street = request.nextUrl.searchParams.get("street");

  if (!street) {
    return NextResponse.json({ houseNumbers: [] });
  }

  const adminDb = getAdminSupabase();
  const houseNumbers = await getHouseNumbersByStreet(adminDb, street);

  return NextResponse.json({ houseNumbers });
}
