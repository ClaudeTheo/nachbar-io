// Nachbar.io — Web Push Subscription Management
// Registriert den Service Worker und verwaltet Push-Subscriptions via VAPID

import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// VAPID Key von Base64URL in Uint8Array konvertieren
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Prüft ob Push-Benachrichtigungen unterstützt werden
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Aktuellen Permission-Status holen
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

// Service Worker registrieren
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.error("Service Worker Registrierung fehlgeschlagen:", err);
    return null;
  }
}

// Push-Benachrichtigungen aktivieren
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    console.error("Push nicht unterstützt oder VAPID Key fehlt");
    return false;
  }

  try {
    // Permission anfragen
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Push-Berechtigung abgelehnt");
      return false;
    }

    // Service Worker holen
    const registration = await navigator.serviceWorker.ready;

    // Bestehende Subscription prüfen
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Neue Subscription erstellen
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Subscription in Supabase speichern
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Nicht angemeldet — Push-Subscription nicht gespeichert");
      return false;
    }

    const subscriptionJson = subscription.toJSON();

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys?.p256dh ?? "",
        auth: subscriptionJson.keys?.auth ?? "",
        user_agent: navigator.userAgent.substring(0, 200),
      },
      {
        onConflict: "endpoint",
      }
    );

    if (error) {
      console.error("Push-Subscription Speichern fehlgeschlagen:", error);
      return false;
    }

    console.log("Push-Subscription gespeichert");
    return true;
  } catch (err) {
    console.error("Push-Subscription Fehler:", err);
    return false;
  }
}

// Push-Benachrichtigungen deaktivieren
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Aus Supabase löschen
      const supabase = createClient();
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);

      // Browser-Subscription entfernen
      await subscription.unsubscribe();
    }

    return true;
  } catch (err) {
    console.error("Push Abmeldung fehlgeschlagen:", err);
    return false;
  }
}

// Prüfen ob bereits subscribed
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}
