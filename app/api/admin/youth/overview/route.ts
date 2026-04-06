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

  // KPIs: Anzahl Youth-Profile
  const { data: allProfiles } = await adminDb
    .from("youth_profiles")
    .select("id");
  const totalProfiles = allProfiles?.length ?? 0;

  // KPIs: Consent-Status zaehlen
  const { data: pendingConsents } = await adminDb
    .from("youth_guardian_consents")
    .select("id")
    .eq("status", "pending");
  const consentsPending = pendingConsents?.length ?? 0;

  const { data: grantedConsents } = await adminDb
    .from("youth_guardian_consents")
    .select("id")
    .eq("status", "granted");
  const consentsGranted = grantedConsents?.length ?? 0;

  const { data: revokedConsents } = await adminDb
    .from("youth_guardian_consents")
    .select("id")
    .eq("status", "revoked");
  const consentsRevoked = revokedConsents?.length ?? 0;

  // Consents-Liste: JOIN youth_profiles -> users, quarters, consents
  const { data: consents } = await adminDb
    .from("youth_profiles")
    .select(
      "id, user_id, birth_year, created_at, users(first_name), quarters(name), youth_guardian_consents(status, granted_at, token_send_count)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // Moderation: flagged count
  const { count: flaggedCount } = await adminDb
    .from("youth_moderation_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "flagged");

  // Moderation: suspended items
  const { data: suspendedItems } = await adminDb
    .from("youth_moderation_log")
    .select("id, action, target_id, created_at, details")
    .eq("action", "suspended")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    kpis: {
      totalProfiles,
      consentsPending,
      consentsGranted,
      consentsRevoked,
    },
    consents: consents ?? [],
    moderation: {
      flaggedCount: flaggedCount ?? 0,
      suspendedItems: suspendedItems ?? [],
    },
  });
}
