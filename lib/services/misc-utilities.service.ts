// Nachbar.io — Misc-Utilities-Service
// Zentralisiert: Anonyme Bug-Reports, Reputation-Neuberechnung, Bewohner-Status
// Business-Logik aus: bug-reports/anonymous, reputation/recompute, resident/status

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { createHash } from "crypto";
import { computeReputationStats } from "@/lib/reputation";
import { HEARTBEAT_ESCALATION } from "@/lib/care/constants";
import type { ResidentStatus } from "@/lib/care/types";
import { getAdminSupabase } from "@/lib/supabase/admin";

// ============================================================
// Anonyme Bug-Reports
// ============================================================

const MAX_REPORTS_PER_HOUR = 3;

/** Fingerprint aus Request-Headers berechnen (DSGVO-konform, kein Klartext) */
export function computeFingerprint(
  ip: string,
  userAgent: string,
  acceptLanguage: string,
): string {
  const raw = `${ip}|${userAgent}|${acceptLanguage}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** IP-Hash fuer bug_reports.ip_hash (nur IP, kein Fingerprint) */
export function computeIpHash(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export interface AnonymousBugReportParams {
  page_url: string;
  page_title?: string;
  screenshot_url?: string;
  console_errors?: string[];
  browser_info?: Record<string, unknown>;
  page_meta?: Record<string, unknown>;
  user_comment?: string;
  website?: string; // Honeypot-Feld
}

/**
 * Anonymen Bug-Report speichern (mit Spam-Schutz).
 * adminSupabase wird benoetigt, da kein User eingeloggt (RLS-Bypass).
 */
export async function submitAnonymousBugReport(
  adminSupabase: SupabaseClient,
  fingerprint: string,
  ipHash: string,
  params: AnonymousBugReportParams,
): Promise<{ success: true }> {
  // Schicht 1: Honeypot — wenn ausgefuellt, still ignorieren
  if (params.website) {
    return { success: true };
  }

  // Schicht 2: Rate-Limit pruefen
  // Alte Eintraege aufräumen (> 1 Stunde)
  await adminSupabase
    .from("bug_report_rate_limits")
    .delete()
    .lt("window_start", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  // Aktuellen Zaehler pruefen
  const { data: rateLimit } = await adminSupabase
    .from("bug_report_rate_limits")
    .select("report_count, window_start")
    .eq("fingerprint_hash", fingerprint)
    .single();

  if (rateLimit && rateLimit.report_count >= MAX_REPORTS_PER_HOUR) {
    throw new ServiceError(
      "Zu viele Bug-Reports. Bitte versuchen Sie es später erneut.",
      429,
    );
  }

  // Rate-Limit Zaehler erhoehen
  if (rateLimit) {
    await adminSupabase
      .from("bug_report_rate_limits")
      .update({ report_count: rateLimit.report_count + 1 })
      .eq("fingerprint_hash", fingerprint);
  } else {
    await adminSupabase
      .from("bug_report_rate_limits")
      .insert({ fingerprint_hash: fingerprint, report_count: 1 });
  }

  // Validierung
  if (!params.page_url || typeof params.page_url !== "string") {
    throw new ServiceError("page_url ist erforderlich", 400);
  }

  // Bug-Report speichern
  const { error: insertError } = await adminSupabase
    .from("bug_reports")
    .insert({
      user_id: null,
      quarter_id: null,
      page_url: params.page_url,
      page_title: params.page_title || null,
      screenshot_url: params.screenshot_url || null,
      console_errors: params.console_errors || [],
      browser_info: params.browser_info || {},
      page_meta: params.page_meta || {},
      user_comment:
        typeof params.user_comment === "string"
          ? params.user_comment.slice(0, 500)
          : null,
      source: "anonymous",
      ip_hash: ipHash,
      status: "new",
    });

  if (insertError) {
    console.error("[BugReport] Anonymer Insert fehlgeschlagen:", insertError);
    throw new ServiceError("Bug-Report konnte nicht gespeichert werden", 500);
  }

  return { success: true };
}

// ============================================================
// Reputation-Neuberechnung
// ============================================================

/**
 * Berechnet die Reputation-Stats eines Nutzers neu und gibt sie zurueck.
 * Prueft Admin-Berechtigung bei fremder userId.
 */
export async function recomputeReputation(
  supabase: SupabaseClient,
  currentUserId: string,
  targetUserId?: string,
): Promise<{ success: true; stats: unknown }> {
  let effectiveUserId = currentUserId;

  if (targetUserId && targetUserId !== currentUserId) {
    // Pruefen ob Admin
    const { data: adminCheck } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", currentUserId)
      .single();

    if (!adminCheck?.is_admin) {
      throw new ServiceError(
        "Nur Admins dürfen fremde Nutzer neu berechnen",
        403,
      );
    }
    effectiveUserId = targetUserId;
  }

  try {
    const stats = await computeReputationStats(supabase, effectiveUserId);
    return { success: true, stats };
  } catch (err) {
    console.error("Reputation-Neuberechnung fehlgeschlagen:", err);
    throw new ServiceError("Neuberechnung fehlgeschlagen", 500);
  }
}

// ============================================================
// Bewohner-Status (Heartbeat + Check-in)
// ============================================================

export interface ResidentStatusResult {
  resident_id: string;
  display_name: string;
  status: ResidentStatus;
  last_heartbeat: string | null;
  heartbeat_visible: boolean;
  last_checkin_status: string | null;
  last_checkin_at: string | null;
  last_checkin: { status: string; at: string } | null;
}

/**
 * Ermittelt den Bewohner-Status basierend auf Heartbeat und Check-in.
 * Nur fuer Caregiver mit gueltigem Link sichtbar.
 */
export async function getResidentStatus(
  supabase: SupabaseClient,
  caregiverId: string,
  residentId: string,
): Promise<ResidentStatusResult> {
  if (!residentId) {
    throw new ServiceError("resident_id ist erforderlich", 400);
  }

  // Pruefen ob Caregiver-Link besteht
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, heartbeat_visible")
    .eq("resident_id", residentId)
    .eq("caregiver_id", caregiverId)
    .is("revoked_at", null)
    .single();

  if (!link) {
    throw new ServiceError("Keine Verknüpfung zu diesem Bewohner", 403);
  }

  const { data: residentProfile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", residentId)
    .maybeSingle();

  // Letzter Heartbeat (nur wenn heartbeat_visible)
  let lastHeartbeat: string | null = null;
  let status: ResidentStatus = "ok";

  if (link.heartbeat_visible) {
    const { data: hb } = await supabase
      .from("heartbeats")
      .select("created_at")
      .eq("user_id", residentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    lastHeartbeat = hb?.created_at ?? null;

    if (!lastHeartbeat) {
      status = "ok"; // Noch nie benutzt → kein Alarm
    } else {
      const hoursAgo =
        (Date.now() - new Date(lastHeartbeat).getTime()) / 3600000;
      // Phase 1 2-Stufen-Modell (Design-Doc 4.5):
      //   <=24h -> ok, 24-48h -> warning (reminder), >48h -> missing (alert)
      if (hoursAgo <= HEARTBEAT_ESCALATION.reminder_after_hours) status = "ok";
      else if (hoursAgo <= HEARTBEAT_ESCALATION.alert_after_hours)
        status = "warning";
      else status = "missing";
    }
  }

  // Letztes Check-in
  // caregiver_links autorisiert den Zugriff, care_checkins-RLS jedoch nur
  // care_helpers. Nach der expliziten Link-Prüfung lesen wir den letzten
  // Check-in deshalb gezielt mit Service-Role, ohne Heartbeat-Sichtbarkeit
  // oder Link-Prüfung zu umgehen.
  const adminSupabase = getAdminSupabase();
  const { data: checkin } = await adminSupabase
    .from("care_checkins")
    .select("status, created_at")
    .eq("senior_id", residentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    resident_id: residentId,
    display_name: residentProfile?.display_name ?? "Bewohner",
    status,
    last_heartbeat: lastHeartbeat,
    heartbeat_visible: link.heartbeat_visible,
    last_checkin_status: checkin?.status ?? null,
    last_checkin_at: checkin?.created_at ?? null,
    last_checkin: checkin
      ? { status: checkin.status, at: checkin.created_at }
      : null,
  };
}
