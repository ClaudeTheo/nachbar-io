import { createClient } from "@/lib/supabase/client";

// URL-Mapping fuer Push-Notifications: Notification-Typ → Ziel-Route
const TYPE_ROUTES: Record<string, string> = {
  alert: "/alerts",
  alert_response: "/alerts",
  help_match: "/help",
  help_response: "/help",
  marketplace: "/marketplace",
  leihboerse: "/leihboerse",
  lost_found: "/lost-found",
  news: "/dashboard",
  message: "/messages",
  event_participation: "/events",
  expert_review: "/experts",
  expert_endorsement: "/experts",
  connection_accepted: "/messages",
  connection_declined: "/messages",
  poll_vote: "/polls",
  tip_confirmation: "/tips",
  checkin_reminder: "/senior/checkin",
  neighbor_invited: "/invitations",
  verification_approved: "/dashboard",
  verification_rejected: "/profile",
  system: "/dashboard",
};

// Zentrale Funktion zum Erstellen von Notifications
// Erstellt In-App Notification UND sendet Push-Notification
// Fire-and-forget: Fehler blockieren nicht die Haupt-Aktion
export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  referenceId?: string;
  referenceType?: string;
}) {
  try {
    const supabase = createClient();

    // Kein Self-Notify
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === params.userId) return;

    // In-App Notification in DB schreiben (mit Constraint-Fallback)
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      reference_id: params.referenceId || null,
      reference_type: params.referenceType || null,
    });

    // Bei CHECK-Constraint-Fehler: Fallback auf 'system' Typ
    if (insertError?.code === "23514" || insertError?.message?.includes("notifications_type_check")) {
      console.warn(`[notifications] Typ '${params.type}' blockiert — Fallback auf 'system'`);
      await supabase.from("notifications").insert({
        user_id: params.userId,
        type: "system",
        title: params.title,
        body: params.body ? `[${params.type}] ${params.body}` : `[${params.type}]`,
        reference_id: params.referenceId || null,
        reference_type: params.referenceType || null,
      });
    }

    // Push-Notification an den Nutzer senden (fire-and-forget)
    const baseRoute = TYPE_ROUTES[params.type] || "/notifications";
    const pushUrl = params.referenceId && params.referenceType
      ? `${baseRoute}/${params.referenceId}`
      : baseRoute;

    sendPushToUser({
      userId: params.userId,
      title: params.title,
      body: params.body,
      url: pushUrl,
      tag: params.type,
    }).catch(() => {
      // Push-Fehler still ignorieren
    });
  } catch {
    // Notification-Fehler still ignorieren
  }
}

// Push-Notification an einen bestimmten Nutzer senden
// Ruft die interne API-Route /api/push/notify auf
async function sendPushToUser(params: {
  userId: string;
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}) {
  try {
    // Auth wird automatisch via Supabase-Session-Cookie mitgesendet
    const response = await fetch("/api/push/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: params.userId,
        title: params.title,
        body: params.body,
        url: params.url || "/notifications",
        tag: params.tag || "nachbar-io",
      }),
    });

    if (!response.ok) {
      console.warn("Push-Notification fehlgeschlagen:", response.status);
    }
  } catch {
    // Netzwerkfehler still ignorieren
  }
}
