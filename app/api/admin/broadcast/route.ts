import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/broadcast
 *
 * Push-Broadcast senden und persistieren.
 * Nur fuer Admins. Speichert den Broadcast als Notification fuer alle Nutzer.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
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

  const body = await request.json();
  const { title, body: messageBody, audience, street, urgency } = body;

  if (!title || !messageBody) {
    return NextResponse.json({ error: "Titel und Nachricht erforderlich" }, { status: 400 });
  }

  // Empfaenger ermitteln
  let recipientQuery = supabase.from("users").select("id");

  if (audience === "street" && street) {
    // Nutzer dieser Strasse ueber household_members + households
    const { data: householdIds } = await supabase
      .from("households")
      .select("id")
      .eq("street_name", street);

    if (householdIds && householdIds.length > 0) {
      const { data: memberUserIds } = await supabase
        .from("household_members")
        .select("user_id")
        .in("household_id", householdIds.map(h => h.id));

      if (memberUserIds && memberUserIds.length > 0) {
        recipientQuery = recipientQuery.in("id", memberUserIds.map(m => m.user_id));
      }
    }
  } else if (audience === "seniors") {
    recipientQuery = recipientQuery.eq("ui_mode", "senior");
  }

  const { data: recipients } = await recipientQuery;
  const recipientIds = recipients?.map(r => r.id) ?? [];

  // Notifications fuer alle Empfaenger erstellen (persistente History)
  const pushTitle = urgency === "urgent" ? `DRINGEND: ${title}` : title;

  if (recipientIds.length > 0) {
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      type: "broadcast",
      title: pushTitle,
      body: messageBody,
      reference_type: "broadcast",
      reference_id: `broadcast-${Date.now()}`,
      read: false,
    }));

    await supabase.from("notifications").insert(notifications);
  }

  // Push-Nachrichten senden (falls VAPID konfiguriert)
  let pushSent = 0;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (internalSecret) {
    try {
      // Interne Push-API aufrufen
      const baseUrl = request.nextUrl.origin;
      const pushRes = await fetch(`${baseUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          title: pushTitle,
          body: messageBody,
          url: "/dashboard",
          tag: `broadcast-${Date.now()}`,
          urgent: urgency === "urgent",
        }),
      });

      if (pushRes.ok) {
        const pushResult = await pushRes.json();
        pushSent = pushResult.sent ?? 0;
      }
    } catch (err) {
      console.error("Push-Versand fehlgeschlagen:", err);
    }
  }

  return NextResponse.json({
    sent: recipientIds.length,
    pushSent,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/admin/broadcast
 *
 * Broadcast-History laden (letzte 50).
 */
export async function GET() {
  const supabase = await createClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
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

  // Broadcasts sind Notifications mit reference_type='broadcast'
  // Gruppiert nach reference_id (gleicher Broadcast = gleiche reference_id)
  const { data: broadcasts } = await supabase
    .from("notifications")
    .select("title, body, reference_id, created_at")
    .eq("reference_type", "broadcast")
    .order("created_at", { ascending: false })
    .limit(200);

  // Nach reference_id gruppieren (jeder Broadcast hat mehrere Notifications)
  const grouped = new Map<string, { title: string; body: string; created_at: string; recipientCount: number }>();

  (broadcasts ?? []).forEach((b: Record<string, unknown>) => {
    const refId = b.reference_id as string;
    if (!grouped.has(refId)) {
      grouped.set(refId, {
        title: b.title as string,
        body: (b.body as string) ?? "",
        created_at: b.created_at as string,
        recipientCount: 0,
      });
    }
    grouped.get(refId)!.recipientCount++;
  });

  const history = [...grouped.values()].slice(0, 50);

  return NextResponse.json({ history });
}
