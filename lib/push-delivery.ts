// Nachbar.io — Push Delivery Helper
// Abstrahiert Push-Versand fuer Postfach-Benachrichtigungen.
// Fire-and-forget: Fehler werden geloggt, nie geworfen.
// Spaeter erweiterbar um APNS/FCM.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

export type PushPortal = "io" | "civic" | "arzt" | "pflege";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  icon?: string;
}

// VAPID-Konfiguration (lazy, idempotent)
let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails("mailto:info@quartierapp.de", pub, priv);
  vapidConfigured = true;
}

// Service-Role-Client (umgeht RLS, sieht alle Subscriptions)
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Sendet Push an alle Subscriptions eines Users fuer ein bestimmtes Portal.
 * Fire-and-forget: faengt alle Fehler intern.
 */
export async function deliverPush(
  userId: string,
  portal: PushPortal,
  payload: PushPayload,
): Promise<void> {
  try {
    ensureVapid();
    const supabase = getServiceClient();

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .eq("portal", portal);

    if (error || !subs?.length) return;

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      icon: payload.icon || "/icons/icon-192x192.svg",
    });

    const expiredEndpoints: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            jsonPayload,
            { TTL: 3600 },
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 410 || status === 404) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      }),
    );

    // Abgelaufene Endpoints aufraeumen
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }
  } catch (err) {
    console.error("[push-delivery] deliverPush fehlgeschlagen:", err);
  }
}

/**
 * Sendet Push an alle Staff-Mitglieder einer verifizierten Org.
 * Portal ist immer 'civic'.
 */
export async function notifyOrgStaff(
  orgId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const supabase = getServiceClient();

    // Org muss verifiziert sein
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .eq("verification_status", "verified")
      .maybeSingle();

    if (!org) return;

    // Alle Members der Org
    const { data: members } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId);

    if (!members?.length) return;

    await Promise.allSettled(
      members.map((m) => deliverPush(m.user_id, "civic", payload)),
    );
  } catch (err) {
    console.error("[push-delivery] notifyOrgStaff fehlgeschlagen:", err);
  }
}

/**
 * Sendet Push an alle Staff-Mitglieder einer civic_organization
 * (civic_members). Genutzt fuer Hausverwaltungs-Modul (type='housing') und
 * andere civic-Welten (kommune, pflege). Portal ist 'civic' (gleich wie
 * notifyOrgStaff), weil beide Welten denselben Cockpit-Channel bespielen.
 *
 * Unterschied zu notifyOrgStaff: liest aus civic_members statt org_members
 * und prueft keine verification_status-Spalte (die existiert fuer
 * civic_organizations nicht). Die Berechtigungs-Logik (z.B. Housing-Master-
 * Flag) ist Verantwortung des Callers.
 */
export async function notifyCivicOrgStaff(
  civicOrgId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const supabase = getServiceClient();

    const { data: members } = await supabase
      .from("civic_members")
      .select("user_id")
      .eq("org_id", civicOrgId);

    if (!members?.length) return;

    await Promise.allSettled(
      members.map((m) => deliverPush(m.user_id, "civic", payload)),
    );
  } catch (err) {
    console.error("[push-delivery] notifyCivicOrgStaff fehlgeschlagen:", err);
  }
}

/**
 * Sendet Push an einen Buerger. Portal ist immer 'io'.
 */
export async function notifyCitizen(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  await deliverPush(userId, "io", payload);
}
