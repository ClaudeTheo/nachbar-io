import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { completeRegistration } from "@/lib/services/registration.service";
import { ServiceError } from "@/lib/services/service-error";

/**
 * POST /api/register/complete
 * Komplette Registrierung serverseitig — Logik in registration.service.ts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await completeRegistration(getAdminSupabase(), body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Registrierung-Complete Fehler:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 },
    );
  }
}
