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
    const adminDb = getAdminSupabase();

    const result = await completeRegistration(adminDb, {
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      uiMode: body.uiMode,
      householdId: body.householdId,
      streetName: body.streetName,
      houseNumber: body.houseNumber,
      lat: body.lat,
      lng: body.lng,
      postalCode: body.postalCode,
      city: body.city,
      verificationMethod: body.verificationMethod,
      inviteCode: body.inviteCode,
      referrerId: body.referrerId,
      quarterId: body.quarterId,
    });

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
