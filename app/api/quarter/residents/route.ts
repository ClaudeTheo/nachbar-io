// GET /api/quarter/residents
// Anonymisierte Bewohnerliste fuer Chat-Anfrage-Browser
// Business-Logik in quarter-residents.service.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listResidents } from "@/lib/services/quarter-residents.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(_request: NextRequest) {
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
    const result = await listResidents(supabase, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
