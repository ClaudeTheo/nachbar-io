// Nachbar.io — Service: Org-Webhooks (auflisten, erstellen, loeschen)
// Extrahiert aus app/api/organizations/[id]/webhooks/route.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { ServiceError } from "@/lib/services/service-error";
import { isValidWebhookUrl } from "@/lib/webhooks";

/**
 * Webhooks einer Organisation auflisten.
 * Secret wird maskiert (nur letzte 4 Zeichen).
 */
export async function listWebhooks(serviceDb: SupabaseClient, orgId: string) {
  const { data: webhooks, error } = await serviceDb
    .from("org_webhooks")
    .select("id, org_id, url, events, secret, created_at, active")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[organizations/webhooks] GET Fehler:", error);
    throw new ServiceError("Webhooks konnten nicht geladen werden", 500);
  }

  // Secret maskieren: nur die letzten 4 Zeichen anzeigen
  return (webhooks ?? []).map((w) => ({
    ...w,
    secret: w.secret ? `****${w.secret.slice(-4)}` : null,
  }));
}

/**
 * Neuen Webhook registrieren.
 * URL muss HTTPS verwenden. Secret wird automatisch generiert.
 */
export async function createWebhook(
  serviceDb: SupabaseClient,
  orgId: string,
  userId: string,
  body: Record<string, unknown>,
) {
  const url = body.url as string | undefined;
  const events = (body.events as string[] | undefined) ?? ["*"];

  // URL Validierung
  if (!url || typeof url !== "string") {
    throw new ServiceError("URL ist erforderlich", 400);
  }

  if (!isValidWebhookUrl(url)) {
    throw new ServiceError("Webhook-URL muss HTTPS verwenden", 400);
  }

  // Secret generieren (32 Bytes = 64 Hex-Zeichen)
  const secret = randomBytes(32).toString("hex");

  const { data: webhook, error } = await serviceDb
    .from("org_webhooks")
    .insert({
      org_id: orgId,
      url,
      events,
      secret,
      active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[organizations/webhooks] POST Fehler:", error);
    throw new ServiceError("Webhook konnte nicht erstellt werden", 500);
  }

  // Audit-Log
  await serviceDb.from("org_audit_log").insert({
    org_id: orgId,
    user_id: userId,
    action: "webhook_created",
    details: { url, events },
  });

  // Secret wird EINMALIG bei Erstellung zurueckgegeben
  return webhook;
}

/**
 * Webhook loeschen.
 * Prueft ob Webhook zur Organisation gehoert.
 */
export async function deleteWebhook(
  serviceDb: SupabaseClient,
  orgId: string,
  userId: string,
  webhookId: string,
) {
  // Pruefen ob Webhook zur Organisation gehoert
  const { data: existing } = await serviceDb
    .from("org_webhooks")
    .select("id, url")
    .eq("id", webhookId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!existing) {
    throw new ServiceError("Webhook nicht gefunden", 404);
  }

  const { error } = await serviceDb
    .from("org_webhooks")
    .delete()
    .eq("id", webhookId);

  if (error) {
    console.error("[organizations/webhooks] DELETE Fehler:", error);
    throw new ServiceError("Webhook konnte nicht geloescht werden", 500);
  }

  // Audit-Log
  await serviceDb.from("org_audit_log").insert({
    org_id: orgId,
    user_id: userId,
    action: "webhook_deleted",
    details: { webhook_id: webhookId, url: existing.url },
  });
}
