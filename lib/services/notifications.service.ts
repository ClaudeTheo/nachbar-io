// Nachbar.io — Notifications-Service
// Zentralisiert Notification-Erstellung mit Beziehungscheck und Push-Versand
// Business-Logik aus: notifications/create

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { safeInsertNotification } from "@/lib/notifications-server";

// ============================================================
// Typen
// ============================================================

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  referenceId?: string;
  referenceType?: string;
}

// Push-URL-Mapping fuer Notification-Typen
const TYPE_ROUTES: Record<string, string> = {
  message: "/messages",
  alert: "/alerts",
  help_match: "/help",
  connection_request: "/messages",
  connection_accepted: "/messages",
  event_participation: "/events",
};

// ============================================================
// Beziehungscheck
// ============================================================

/**
 * Prueft ob Sender und Empfaenger eine Beziehung haben.
 * Erlaubt: Admin, gleicher Haushalt, Caregiver-Link, gleiches Quartier.
 */
async function checkUserRelationship(
  supabase: SupabaseClient,
  senderId: string,
  recipientId: string,
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
      `and(caregiver_id.eq.${senderId},resident_id.eq.${recipientId}),and(resident_id.eq.${senderId},caregiver_id.eq.${recipientId})`,
    )
    .limit(1);

  if (caregiverLink && caregiverLink.length > 0) {
    return true;
  }

  // 4. Akzeptierter Chat-Kontakt (auch quartieruebergreifend)
  const { data: contactLink } = await supabase
    .from("contact_links")
    .select("requester_id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${senderId},addressee_id.eq.${recipientId}),and(addressee_id.eq.${senderId},requester_id.eq.${recipientId})`,
    )
    .limit(1);

  if (contactLink && contactLink.length > 0) {
    return true;
  }

  // 5. Gleiches Quartier (ueber household_members → households)
  const { data: senderQuarter } = await supabase
    .from("household_members")
    .select("households(quarter_id)")
    .eq("user_id", senderId)
    .limit(1)
    .single();

  const senderQuarterId = (
    senderQuarter?.households as { quarter_id?: string } | null
  )?.quarter_id;

  if (senderQuarterId) {
    const { data: recipientQuarter } = await supabase
      .from("household_members")
      .select("households(quarter_id)")
      .eq("user_id", recipientId)
      .limit(1)
      .single();

    const recipientQuarterId = (
      recipientQuarter?.households as { quarter_id?: string } | null
    )?.quarter_id;

    if (recipientQuarterId && senderQuarterId === recipientQuarterId) {
      return true;
    }
  }

  return false;
}

// ============================================================
// Notification erstellen
// ============================================================

/**
 * Erstellt eine Notification mit Beziehungscheck.
 * Gibt Push-URL zurueck fuer optionalen Push-Versand durch die Route.
 */
export async function createNotification(
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
  senderId: string,
  params: CreateNotificationParams,
): Promise<{
  ok: true;
  skipped?: boolean;
  fallback?: boolean;
  pushUrl?: string;
}> {
  const { userId, type, title, body, referenceId, referenceType } = params;

  // Pflichtfelder
  if (!userId || !type || !title) {
    throw new ServiceError("userId, type und title sind Pflichtfelder", 400);
  }

  // Kein Self-Notify
  if (senderId === userId) {
    return { ok: true, skipped: true };
  }

  // Beziehungscheck: Nur an User mit Beziehung senden
  const hasRelationship = await checkUserRelationship(
    userClient,
    senderId,
    userId,
  );
  if (!hasRelationship) {
    throw new ServiceError("Keine Berechtigung für diesen Empfänger", 403);
  }

  // Notification einfuegen (via Service-Client, umgeht RLS)
  const result = await safeInsertNotification(serviceClient, {
    user_id: userId,
    type,
    title,
    body: body || null,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
  });

  if (!result.success) {
    console.error("[notifications.service] Fehlgeschlagen:", result.error);
    throw new ServiceError("Notification konnte nicht erstellt werden", 500);
  }

  // Push-URL berechnen
  const baseRoute = TYPE_ROUTES[type] || "/notifications";
  const pushUrl =
    referenceId && referenceType ? `${baseRoute}/${referenceId}` : baseRoute;

  return { ok: true, fallback: result.usedFallback, pushUrl };
}
