// Nachbar.io — Moderation-Service
// Zentralisiert Block/Unblock, KI-Moderation und Content-Reporting
// Business-Logik aus: moderation/block, moderation/moderate, moderation/report

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { moderateContent as aiModerateContent } from "@/lib/moderation/service";
import { calculateReportWeight } from "@/lib/moderation/report-weight";
import type {
  BlockLevel,
  ModerationChannel,
  ModerationResult,
  ReportReason,
} from "@/lib/moderation/types";

// ============================================================
// Konstanten
// ============================================================

const VALID_BLOCK_LEVELS: BlockLevel[] = ["mute", "block", "safety"];
const VALID_CHANNELS: ModerationChannel[] = [
  "board",
  "marketplace",
  "chat",
  "comment",
  "profile",
];
const VALID_REASONS: ReportReason[] = [
  "spam",
  "harassment",
  "hate",
  "scam",
  "inappropriate",
  "wrong_category",
  "other",
];

// ============================================================
// Block / Unblock
// ============================================================

/**
 * Blockiert oder stummschaltet einen Nutzer (Upsert).
 */
export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string,
  blockLevel: BlockLevel = "block",
): Promise<{ success: true; message: string }> {
  if (!blockedId) {
    throw new ServiceError("blockedId ist erforderlich", 400);
  }

  // Sich selbst blockieren verhindern
  if (blockedId === blockerId) {
    throw new ServiceError("Sie können sich nicht selbst blockieren", 400);
  }

  if (!VALID_BLOCK_LEVELS.includes(blockLevel)) {
    throw new ServiceError("Ungültiges Block-Level", 400);
  }

  // Upsert: Block erstellen oder Block-Level aktualisieren
  const { error } = await supabase.from("user_blocks").upsert(
    {
      blocker_id: blockerId,
      blocked_id: blockedId,
      block_level: blockLevel,
    },
    { onConflict: "blocker_id,blocked_id" },
  );

  if (error) {
    console.error("[moderation] Block-Erstellung fehlgeschlagen:", error);
    throw new ServiceError("Block konnte nicht erstellt werden", 500);
  }

  return { success: true, message: "Nutzer blockiert" };
}

/**
 * Hebt einen Block auf.
 */
export async function unblockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string,
): Promise<{ success: true; message: string }> {
  if (!blockedId) {
    throw new ServiceError("blockedId ist erforderlich", 400);
  }

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    console.error("[moderation] Block-Aufhebung fehlgeschlagen:", error);
    throw new ServiceError("Block konnte nicht aufgehoben werden", 500);
  }

  return { success: true, message: "Block aufgehoben" };
}

// ============================================================
// KI-Moderation
// ============================================================

export interface ModerateContentParams {
  text: string;
  channel: string;
  contentId?: string;
  contentType?: string;
}

/**
 * Moderiert Inhalte per KI und fuegt auffaellige in die Queue ein.
 */
export async function moderateContentRoute(
  supabase: SupabaseClient,
  authorId: string,
  params: ModerateContentParams,
): Promise<ModerationResult> {
  const { text, channel, contentId, contentType } = params;

  // Pflichtfelder validieren
  if (!text || !channel) {
    throw new ServiceError("text und channel sind erforderlich", 400);
  }

  if (!VALID_CHANNELS.includes(channel as ModerationChannel)) {
    throw new ServiceError("Ungültiger Kanal", 400);
  }

  // KI-Moderation ausfuehren
  const result = await aiModerateContent({
    text,
    channel: channel as ModerationChannel,
    authorId,
    contentId: contentId || "",
    contentType: contentType || channel,
  });

  // Bei Auffälligkeiten und vorhandenem contentId → in Moderation-Queue einfuegen
  if (result.score !== "green" && contentId) {
    const { error: queueError } = await supabase
      .from("moderation_queue")
      .insert({
        content_type: contentType || channel,
        content_id: contentId,
        ai_score: result.score,
        ai_reason: result.reason,
        ai_confidence: result.confidence,
        flagged_categories: result.flaggedCategories,
        status: "pending",
      });

    if (queueError) {
      console.error("[moderation] Queue-Eintrag fehlgeschlagen:", queueError);
      // Fehler beim Queue-Eintrag blockiert nicht die Antwort
    }
  }

  return {
    score: result.score,
    reason: result.reason,
    confidence: result.confidence,
    flaggedCategories: result.flaggedCategories,
  };
}

// ============================================================
// Content-Report
// ============================================================

export interface ReportContentParams {
  contentType: string;
  contentId: string;
  reasonCategory: string;
  reasonText?: string;
}

/**
 * Meldet einen Inhalt mit Gewichtung und Doppel-Meldungs-Schutz.
 */
export async function reportContent(
  supabase: SupabaseClient,
  reporterId: string,
  params: ReportContentParams,
): Promise<{ success: true; message: string }> {
  const { contentType, contentId, reasonCategory, reasonText } = params;

  // Pflichtfelder validieren
  if (!contentType || !contentId || !reasonCategory) {
    throw new ServiceError(
      "contentType, contentId und reasonCategory sind erforderlich",
      400,
    );
  }

  if (!VALID_REASONS.includes(reasonCategory as ReportReason)) {
    throw new ServiceError("Ungültiger Meldegrund", 400);
  }

  // Doppel-Meldung pruefen
  const { data: existingReport } = await supabase
    .from("content_reports")
    .select("id")
    .eq("reporter_id", reporterId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .maybeSingle();

  if (existingReport) {
    throw new ServiceError("Sie haben diesen Inhalt bereits gemeldet", 409);
  }

  // Report-Gewicht berechnen
  const { data: profile } = await supabase
    .from("users")
    .select("created_at, household_id, verified")
    .eq("id", reporterId)
    .single();

  const accountAgeDays = profile?.created_at
    ? Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  // Fallback: verifiziert wenn Feld vorhanden, sonst Account aelter als 30 Tage
  const reporterVerified = profile?.verified ?? accountAgeDays >= 30;

  // Haushalt-Reports auf denselben Content zaehlen
  let householdReportsOnSameContent = 0;
  if (profile?.household_id) {
    const { count } = await supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("content_type", contentType)
      .eq("content_id", contentId)
      .neq("reporter_id", reporterId)
      .in(
        "reporter_id",
        // Sub-Query: alle User im selben Haushalt
        (
          await supabase
            .from("users")
            .select("id")
            .eq("household_id", profile.household_id)
            .neq("id", reporterId)
        ).data?.map((u: { id: string }) => u.id) ?? [],
      );
    householdReportsOnSameContent = count ?? 0;
  }

  const weight = calculateReportWeight({
    reporterVerified,
    accountAgeDays,
    householdReportsOnSameContent,
  });

  // Report einfuegen
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: reporterId,
    content_type: contentType,
    content_id: contentId,
    reason_category: reasonCategory,
    reason_text: reasonText || null,
    weight,
  });

  if (error) {
    console.error("[moderation] Report-Erstellung fehlgeschlagen:", error);
    throw new ServiceError("Meldung konnte nicht erstellt werden", 500);
  }

  return { success: true, message: "Danke, wir prüfen das." };
}
