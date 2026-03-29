// Nachbar.io — Service-Logik fuer Admin-Broadcast
// Extrahiert aus app/api/admin/broadcast/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { safeInsertNotifications } from "@/lib/notifications-server";

export interface SendBroadcastParams {
  title: string;
  body: string;
  audience: string;
  street?: string;
  urgency?: string;
  baseUrl: string;
}

export interface BroadcastHistoryEntry {
  title: string;
  body: string;
  created_at: string;
  recipientCount: number;
}

export async function sendBroadcast(
  supabase: SupabaseClient,
  params: SendBroadcastParams
): Promise<{ sent: number; pushSent: number; timestamp: string }> {
  const { title, body, audience, street, urgency, baseUrl } = params;

  // Validierung
  if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 200) {
    throw new ServiceError("Titel muss 3-200 Zeichen lang sein", 400);
  }
  if (!body || typeof body !== "string" || body.trim().length < 3 || body.trim().length > 5000) {
    throw new ServiceError("Nachricht muss 3-5000 Zeichen lang sein", 400);
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
        .in("household_id", householdIds.map((h: { id: string }) => h.id));

      if (memberUserIds && memberUserIds.length > 0) {
        recipientQuery = recipientQuery.in("id", memberUserIds.map((m: { user_id: string }) => m.user_id));
      }
    }
  } else if (audience === "seniors") {
    recipientQuery = recipientQuery.eq("ui_mode", "senior");
  }

  const { data: recipients } = await recipientQuery;
  const recipientIds = recipients?.map((r: { id: string }) => r.id) ?? [];

  // Notifications fuer alle Empfaenger erstellen (persistente History)
  const pushTitle = urgency === "urgent" ? `DRINGEND: ${title}` : title;

  if (recipientIds.length > 0) {
    const notifications = recipientIds.map((userId: string) => ({
      user_id: userId,
      type: "broadcast",
      title: pushTitle,
      body: body,
      reference_type: "broadcast",
      reference_id: `broadcast-${Date.now()}`,
      read: false,
    }));

    await safeInsertNotifications(supabase, notifications);
  }

  // Push-Nachrichten senden (falls VAPID konfiguriert)
  let pushSent = 0;
  const internalSecret = process.env.INTERNAL_API_SECRET;

  if (internalSecret) {
    try {
      const pushRes = await fetch(`${baseUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          title: pushTitle,
          body: body,
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

  return {
    sent: recipientIds.length,
    pushSent,
    timestamp: new Date().toISOString(),
  };
}

export async function getBroadcastHistory(
  supabase: SupabaseClient
): Promise<BroadcastHistoryEntry[]> {
  // Broadcasts sind Notifications mit reference_type='broadcast'
  // Gruppiert nach reference_id (gleicher Broadcast = gleiche reference_id)
  const { data: broadcasts } = await supabase
    .from("notifications")
    .select("title, body, reference_id, created_at")
    .eq("reference_type", "broadcast")
    .order("created_at", { ascending: false })
    .limit(200);

  // Nach reference_id gruppieren (jeder Broadcast hat mehrere Notifications)
  const grouped = new Map<string, BroadcastHistoryEntry>();

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

  return [...grouped.values()].slice(0, 50);
}
