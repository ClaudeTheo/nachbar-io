// app/api/notifications/create/route.ts
// Nachbar.io — Server-seitige Notification-Erstellung
// Umgeht RLS-Probleme, da der Service Role Key verwendet wird
// Client ruft diese Route auf statt direkt in die DB zu schreiben

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { safeInsertNotification } from "@/lib/notifications-server";

export async function POST(request: NextRequest) {
  // 1. Authentifizierung pruefen (normaler User-Client)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // 2. Body parsen
  let body: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    referenceId?: string;
    referenceType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges Format" }, { status: 400 });
  }

  const { userId, type, title, body: notifBody, referenceId, referenceType } = body;

  if (!userId || !type || !title) {
    return NextResponse.json({ error: "userId, type und title sind Pflichtfelder" }, { status: 400 });
  }

  // 3. Kein Self-Notify
  if (user.id === userId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 3b. Beziehungscheck: Nur an User mit Beziehung senden
  const hasRelationship = await checkUserRelationship(supabase, user.id, userId);
  if (!hasRelationship) {
    return NextResponse.json({ error: "Keine Berechtigung fuer diesen Empfaenger" }, { status: 403 });
  }

  // 4. Service-Role Client fuer INSERT (umgeht RLS)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 5. Notification einfuegen
  const result = await safeInsertNotification(serviceClient, {
    user_id: userId,
    type,
    title,
    body: notifBody || null,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
  });

  if (!result.success) {
    console.error("[api/notifications/create] Fehlgeschlagen:", result.error);
    return NextResponse.json({ error: "Notification konnte nicht erstellt werden" }, { status: 500 });
  }

  // 6. Push-Notification senden (fire-and-forget)
  try {
    const TYPE_ROUTES: Record<string, string> = {
      message: "/messages",
      alert: "/alerts",
      help_match: "/help",
      connection_request: "/messages",
      connection_accepted: "/messages",
      event_participation: "/events",
    };
    const baseRoute = TYPE_ROUTES[type] || "/notifications";
    const pushUrl = referenceId && referenceType
      ? `${baseRoute}/${referenceId}`
      : baseRoute;

    // Interne Push-Route aufrufen
    const pushRes = await fetch(new URL("/api/push/notify", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        userId,
        title,
        body: notifBody,
        url: pushUrl,
        tag: type,
      }),
    });
    if (!pushRes.ok) {
      console.warn("[api/notifications/create] Push fehlgeschlagen:", pushRes.status);
    }
  } catch {
    // Push-Fehler ignorieren
  }

  return NextResponse.json({ ok: true, fallback: result.usedFallback });
}

// Beziehungscheck: Gleicher Haushalt, Caregiver-Link, gleiches Quartier, oder Admin
async function checkUserRelationship(
  supabase: Awaited<ReturnType<typeof createClient>>,
  senderId: string,
  recipientId: string
): Promise<boolean> {
  // 1. Admin darf an alle senden
  const { data: sender } = await supabase
    .from("users")
    .select("is_admin, role")
    .eq("id", senderId)
    .single();

  if (sender?.is_admin || sender?.role === "super_admin") {
    return true;
  }

  // 2. Gleicher Haushalt
  const { data: senderHouseholds } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", senderId);

  if (senderHouseholds && senderHouseholds.length > 0) {
    const householdIds = senderHouseholds.map((h) => h.household_id);
    const { data: recipientInHousehold } = await supabase
      .from("household_members")
      .select("id")
      .eq("user_id", recipientId)
      .in("household_id", householdIds)
      .limit(1);

    if (recipientInHousehold && recipientInHousehold.length > 0) {
      return true;
    }
  }

  // 3. Caregiver-Link (in beide Richtungen)
  const { data: caregiverLink } = await supabase
    .from("caregiver_links")
    .select("id")
    .is("revoked_at", null)
    .or(
      `and(caregiver_id.eq.${senderId},resident_id.eq.${recipientId}),and(resident_id.eq.${senderId},caregiver_id.eq.${recipientId})`
    )
    .limit(1);

  if (caregiverLink && caregiverLink.length > 0) {
    return true;
  }

  // 4. Gleiches Quartier (ueber household_members → households)
  const { data: senderQuarter } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", senderId)
    .limit(1)
    .single();

  const senderQuarterId = (senderQuarter?.households as { quarter_id?: string } | null)?.quarter_id;

  if (senderQuarterId) {
    const { data: recipientQuarter } = await supabase
      .from("household_members")
      .select("households(quarter_id)")
      .eq("user_id", recipientId)
      .limit(1)
      .single();

    const recipientQuarterId = (recipientQuarter?.households as { quarter_id?: string } | null)?.quarter_id;

    if (recipientQuarterId && senderQuarterId === recipientQuarterId) {
      return true;
    }
  }

  return false;
}
