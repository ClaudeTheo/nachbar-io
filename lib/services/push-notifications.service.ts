// Nachbar.io — Push-Notifications-Service
// Zentralisiert VAPID-Konfiguration, Push-Versand und Subscription-Verwaltung
// Business-Logik aus: push/notify, push/send, push/subscribe

import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// VAPID-Konfiguration — lazy initialisiert
// ============================================================

let vapidConfigured = false;

/** VAPID-Keys konfigurieren (idempotent, wirft ServiceError bei Fehlkonfiguration) */
export function ensureVapid(): void {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) {
    console.error(
      `VAPID-Keys fehlen: pub=${pub ? "SET" : "MISSING"}(${pub?.length ?? 0}), priv=${priv ? "SET" : "MISSING"}(${priv?.length ?? 0})`,
    );
    throw new ServiceError("Push nicht konfiguriert", 503);
  }
  try {
    webpush.setVapidDetails("mailto:info@quartierapp.de", pub, priv);
    vapidConfigured = true;
  } catch (err) {
    console.error("VAPID-Konfiguration fehlgeschlagen:", err);
    throw new ServiceError("Push nicht konfiguriert", 503);
  }
}

// ============================================================
// Hilfsfunktionen
// ============================================================

/** URL-Validierung: Nur relative Pfade erlauben (kein Phishing) */
function sanitizeUrl(url: unknown, fallback: string): string {
  return typeof url === "string" && url.startsWith("/") ? url : fallback;
}

/** Push-Payload an Subscriptions senden und abgelaufene Endpoints aufräumen */
async function sendToSubscriptions(
  supabase: SupabaseClient,
  subscriptions: Array<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>,
  payload: string,
): Promise<{ sent: number; failed: number; cleaned: number }> {
  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
          { TTL: 3600 },
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }),
  );

  // Abgelaufene Subscriptions aufräumen
  if (expiredEndpoints.length > 0) {
    const { error: cleanupError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
    if (cleanupError) {
      console.error("Push-Cleanup fehlgeschlagen:", cleanupError.message);
    }
  }

  return { sent, failed, cleaned: expiredEndpoints.length };
}

// ============================================================
// Gezielte Push-Notification (an einzelnen Nutzer)
// ============================================================

export interface NotifyUserParams {
  userId: string;
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

/**
 * Sendet Push-Notification an einen bestimmten Nutzer.
 * Wirft ServiceError bei Fehlern.
 */
export async function notifyUser(
  supabase: SupabaseClient,
  params: NotifyUserParams,
): Promise<{ sent: number; failed: number; cleaned: number }> {
  const { userId, title, body, url, tag } = params;

  if (!userId || !title) {
    throw new ServiceError("userId und title erforderlich", 400);
  }

  const safeUrl = sanitizeUrl(url, "/notifications");
  ensureVapid();

  // Push-Subscriptions des Ziel-Nutzers laden
  const { data: subscriptions, error: fetchError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (fetchError) {
    console.error("Push-Subscriptions laden fehlgeschlagen:", fetchError);
    throw new ServiceError("Subscriptions nicht ladbar", 500);
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    url: safeUrl,
    tag: tag || "nachbar-io",
    urgent: false,
  });

  return sendToSubscriptions(supabase, subscriptions, payload);
}

// ============================================================
// Broadcast Push-Notification (an alle Quartiersmitglieder)
// ============================================================

export interface BroadcastPushParams {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  urgent?: boolean;
  excludeUserId?: string;
}

/**
 * Sendet Push-Notification an alle Subscriptions (Broadcast).
 * Wirft ServiceError bei Fehlern.
 */
export async function broadcastPush(
  supabase: SupabaseClient,
  params: BroadcastPushParams,
): Promise<{ sent: number; failed: number; cleaned: number }> {
  const { title, body, url, tag, urgent, excludeUserId } = params;

  if (!title) {
    throw new ServiceError("Titel erforderlich", 400);
  }

  const safeUrl = sanitizeUrl(url, "/dashboard");
  ensureVapid();

  // Alle Push-Subscriptions laden (ausser Absender, max 5000)
  const query = supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .limit(5000);
  if (excludeUserId) {
    query.neq("user_id", excludeUserId);
  }
  const { data: subscriptions, error: fetchError } = await query;

  if (fetchError) {
    console.error("Push-Subscriptions laden fehlgeschlagen:", fetchError);
    throw new ServiceError("Empfänger konnten nicht geladen werden", 500);
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    url: safeUrl,
    tag: tag || "nachbar-io",
    urgent: urgent || false,
  });

  return sendToSubscriptions(supabase, subscriptions, payload);
}

// ============================================================
// Subscription-Verwaltung
// ============================================================

export interface SubscribePushParams {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Speichert eine Push-Subscription fuer den Nutzer.
 * Loescht vorherige Subscription mit gleichem Endpoint (Upsert-Logik).
 */
export async function subscribePush(
  supabase: SupabaseClient,
  userId: string,
  params: SubscribePushParams,
): Promise<{ success: true }> {
  const { endpoint, keys } = params;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new ServiceError("Ungültige Push-Subscription", 400);
  }

  // SICHERHEIT (M5): Push-Endpoint muss HTTPS sein
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    throw new ServiceError("Push-Endpoint muss HTTPS verwenden", 400);
  }

  // Längenbeschränkung fuer Endpoint-URL
  if (endpoint.length > 2048) {
    throw new ServiceError("Push-Endpoint zu lang", 400);
  }

  // Bestehende Subscription loeschen (falls vorhanden)
  const { error: deleteOldError } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (deleteOldError) {
    console.error(
      "Push-Subscription Bereinigung fehlgeschlagen:",
      deleteOldError.message,
    );
  }

  // Neue Subscription speichern
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  return { success: true };
}

/**
 * Entfernt eine Push-Subscription fuer den Nutzer.
 */
export async function unsubscribePush(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<{ success: true }> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    throw new ServiceError("Vorgang fehlgeschlagen", 500);
  }

  return { success: true };
}
