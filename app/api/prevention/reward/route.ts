// GET /api/prevention/reward?enrollmentId=... — Belohnungsstufe berechnen
// POST /api/prevention/reward — Trial an Angehoerige vergeben
// WICHTIG: POST nutzt Admin-Client weil plus_trial_end Trigger service_role erfordert
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  calculateAndStoreRewardTier,
  grantPlusTrial,
} from "@/modules/praevention/services/reward.service";

export async function GET(request: NextRequest) {
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

  const enrollmentId = request.nextUrl.searchParams.get("enrollmentId");
  if (!enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId erforderlich" },
      { status: 400 },
    );
  }

  try {
    const result = await calculateAndStoreRewardTier(supabase, enrollmentId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
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

  let body: { enrollmentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  if (!body.enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId erforderlich" },
      { status: 400 },
    );
  }

  try {
    // Stufe berechnen (User-scoped: liest eigene Enrollment)
    const { tier } = await calculateAndStoreRewardTier(
      supabase,
      body.enrollmentId,
    );

    // Trial vergeben (Admin-Client: Trigger auf caregiver_links erfordert service_role
    // fuer plus_trial_end Updates)
    const adminDb = getAdminSupabase();
    const result = await grantPlusTrial(adminDb, body.enrollmentId, tier);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
