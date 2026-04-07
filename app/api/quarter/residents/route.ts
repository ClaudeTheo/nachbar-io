// GET /api/quarter/residents
// Anonymisierte Bewohnerliste fuer Chat-Anfrage-Browser
// Business-Logik in quarter-residents.service.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { listResidents } from "@/lib/services/quarter-residents.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(_request: NextRequest) {
  // Auth per User-Client pruefen
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    // Admin-Client fuer DB-Abfrage: RLS blockiert household_members anderer Haushalte
    // Auth ist oben bereits geprueft, listResidents filtert serverseitig nach Quartier
    const adminClient = getAdminSupabase();
    const result = await listResidents(adminClient, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
