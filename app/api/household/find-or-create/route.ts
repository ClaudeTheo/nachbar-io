import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { findOrCreateHousehold } from "@/lib/services/household.service";
import { handleServiceError } from "@/lib/services/service-error";

/**
 * POST /api/household/find-or-create
 * Sucht einen Haushalt anhand von Straße und Hausnummer.
 * Wenn nicht vorhanden, wird ein neuer Haushalt angelegt.
 * Gibt die household_id zurück.
 *
 * SICHERHEIT: Erfordert authentifizierten User.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth-Check: User muss eingeloggt sein
    const supabaseAuth = await createServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Nicht autorisiert." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { streetName, houseNumber, lat, lng } = body;

    const adminDb = getAdminSupabase();
    const result = await findOrCreateHousehold(adminDb, {
      streetName,
      houseNumber,
      lat,
      lng,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
