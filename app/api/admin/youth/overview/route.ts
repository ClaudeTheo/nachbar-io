// app/api/admin/youth/overview/route.ts
// Admin-Endpunkt: Jugendschutz-Uebersicht (KPIs, Consents, Moderation)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  // --- Auth: nur Admins ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  // --- Admin-Queries (Service-Role, umgeht RLS) ---
  const adminDb = getAdminSupabase();

  // KPIs: head:true Counts (kein N+1, nur Zaehler zurueck)
  const [profilesRes, pendingRes, grantedRes, revokedRes] = await Promise.all([
    adminDb.from("youth_profiles").select("id", { count: "exact", head: true }),
    adminDb.from("youth_guardian_consents").select("id", { count: "exact", head: true }).eq("status", "pending"),
    adminDb.from("youth_guardian_consents").select("id", { count: "exact", head: true }).eq("status", "granted"),
    adminDb.from("youth_guardian_consents").select("id", { count: "exact", head: true }).eq("status", "revoked"),
  ]);

  // Fehlerbehandlung KPIs
  const kpiErrors = [profilesRes.error, pendingRes.error, grantedRes.error, revokedRes.error].filter(Boolean);
  if (kpiErrors.length > 0) {
    console.error("[admin/youth/overview] DB-Fehler (KPIs):", kpiErrors);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  const totalProfiles = profilesRes.count ?? 0;
  const consentsPending = pendingRes.count ?? 0;
  const consentsGranted = grantedRes.count ?? 0;
  const consentsRevoked = revokedRes.count ?? 0;

  // Consents-Liste: JOIN youth_profiles -> users, quarters, consents
  const { data: consents, error: consentsError } = await adminDb
    .from("youth_profiles")
    .select(
      "id, user_id, birth_year, created_at, users(first_name), quarters(name), youth_guardian_consents(status, granted_at, token_send_count)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (consentsError) {
    console.error("[admin/youth/overview] DB-Fehler (Consents):", consentsError);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  // Moderation: flagged count + suspended items
  const [flaggedRes, suspendedRes] = await Promise.all([
    adminDb
      .from("youth_moderation_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "flagged"),
    adminDb
      .from("youth_moderation_log")
      .select("id, action, target_id, created_at, details")
      .eq("action", "suspended")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const modErrors = [flaggedRes.error, suspendedRes.error].filter(Boolean);
  if (modErrors.length > 0) {
    console.error("[admin/youth/overview] DB-Fehler (Moderation):", modErrors);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  return NextResponse.json({
    kpis: {
      totalProfiles,
      consentsPending,
      consentsGranted,
      consentsRevoked,
    },
    consents: consents ?? [],
    moderation: {
      flaggedCount: flaggedRes.count ?? 0,
      suspendedItems: suspendedRes.data ?? [],
    },
  });
}
