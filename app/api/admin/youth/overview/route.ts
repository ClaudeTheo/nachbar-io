// app/api/admin/youth/overview/route.ts
// Admin-Endpunkt: Jugendschutz-Uebersicht (KPIs, Consents, Moderation)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface YouthProfileRow {
  id: string;
  user_id: string;
  birth_year: number;
  age_group: string;
  access_level: string;
  quarter_id: string | null;
  created_at: string;
}

interface YouthConsentRow {
  youth_user_id: string;
  status: string;
  granted_at: string | null;
  token_send_count: number;
  created_at: string;
}

interface YouthUserRow {
  id: string;
  display_name: string | null;
}

interface YouthQuarterRow {
  id: string;
  name: string | null;
}

interface YouthModerationRow {
  id: string;
  action: string;
  target_id: string;
  target_type: string;
  created_at: string;
  reason: string | null;
}

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

  // Consents-Liste: Profile getrennt laden, weil Prod keine PostgREST-
  // Relationship youth_profiles -> public.users im Schema-Cache hat.
  // youth_guardian_consents kann mehrere Eintraege haben (revoked + neues pending).
  // Wir holen alle und waehlen serverseitig den kanonischen Consent aus.
  const { data: profileRows, error: consentsError } = await adminDb
    .from("youth_profiles")
    .select(
      "id, user_id, birth_year, age_group, access_level, quarter_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (consentsError) {
    console.error("[admin/youth/overview] DB-Fehler (Consents):", consentsError);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  const profiles = (profileRows ?? []) as YouthProfileRow[];
  const userIds = [
    ...new Set(profiles.map((profile) => profile.user_id).filter(Boolean)),
  ];
  const quarterIds = [
    ...new Set(profiles.map((profile) => profile.quarter_id).filter(Boolean)),
  ] as string[];

  const userById = new Map<string, YouthUserRow>();
  if (userIds.length > 0) {
    const { data: userRows, error: usersError } = await adminDb
      .from("users")
      .select("id, display_name")
      .in("id", userIds);

    if (usersError) {
      console.error("[admin/youth/overview] DB-Fehler (Users):", usersError);
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    for (const userRow of (userRows ?? []) as YouthUserRow[]) {
      userById.set(userRow.id, userRow);
    }
  }

  const quarterById = new Map<string, YouthQuarterRow>();
  if (quarterIds.length > 0) {
    const { data: quarterRows, error: quartersError } = await adminDb
      .from("quarters")
      .select("id, name")
      .in("id", quarterIds);

    if (quartersError) {
      console.error("[admin/youth/overview] DB-Fehler (Quarters):", quartersError);
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    for (const quarterRow of (quarterRows ?? []) as YouthQuarterRow[]) {
      quarterById.set(quarterRow.id, quarterRow);
    }
  }

  const consentsByUserId = new Map<string, YouthConsentRow[]>();
  if (userIds.length > 0) {
    const { data: consentRows, error: consentRowsError } = await adminDb
      .from("youth_guardian_consents")
      .select("youth_user_id, status, granted_at, token_send_count, created_at")
      .in("youth_user_id", userIds);

    if (consentRowsError) {
      console.error(
        "[admin/youth/overview] DB-Fehler (Consent Rows):",
        consentRowsError,
      );
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    for (const consent of (consentRows ?? []) as YouthConsentRow[]) {
      const existing = consentsByUserId.get(consent.youth_user_id) ?? [];
      existing.push(consent);
      consentsByUserId.set(consent.youth_user_id, existing);
    }
  }

  // Moderation: flagged count + suspended items
  const [flaggedRes, suspendedRes] = await Promise.all([
    adminDb
      .from("youth_moderation_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "flagged"),
    adminDb
      .from("youth_moderation_log")
      .select("id, action, target_id, target_type, created_at, reason")
      .eq("action", "suspended")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const modErrors = [flaggedRes.error, suspendedRes.error].filter(Boolean);
  if (modErrors.length > 0) {
    console.error("[admin/youth/overview] DB-Fehler (Moderation):", modErrors);
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  // Consent-Normalisierung: Pro Profil genau EINEN kanonischen Consent waehlen
  // Prioritaet: granted > pending > revoked > expired (neuester je Status)
  const STATUS_PRIORITY: Record<string, number> = {
    granted: 0,
    pending: 1,
    revoked: 2,
    expired: 3,
  };

  const normalizedConsents = profiles.map((profile) => {
      const consentArr = consentsByUserId.get(profile.user_id) ?? [];

      // Kanonischen Consent waehlen: Prioritaet nach Status, dann neuester
      const canonical =
        consentArr.length > 0
          ? consentArr.sort((a, b) => {
              const prioA = STATUS_PRIORITY[a.status as string] ?? 99;
              const prioB = STATUS_PRIORITY[b.status as string] ?? 99;
              if (prioA !== prioB) return prioA - prioB;
              // Gleicher Status: neuester zuerst
              return (
                new Date(b.created_at as string).getTime() -
                new Date(a.created_at as string).getTime()
              );
            })[0]
          : null;

      return {
        userId: profile.user_id,
        firstName:
          userById.get(profile.user_id)?.display_name ?? "–",
        quarterName:
          (profile.quarter_id
            ? quarterById.get(profile.quarter_id)?.name
            : null) ?? "–",
        ageGroup: profile.age_group ?? null,
        accessLevel: profile.access_level ?? null,
        consentStatus: (canonical?.status as string) ?? "none",
        grantedAt: (canonical?.granted_at as string) ?? null,
        tokenSendCount: (canonical?.token_send_count as number) ?? 0,
      };
    });

  return NextResponse.json({
    kpis: {
      totalProfiles,
      consentsPending,
      consentsGranted,
      consentsRevoked,
    },
    consents: normalizedConsents,
    moderation: {
      flaggedCount: flaggedRes.count ?? 0,
      suspendedItems: ((suspendedRes.data ?? []) as YouthModerationRow[]).map(
        (item) => ({
          ...item,
          details: null,
        }),
      ),
    },
  });
}
