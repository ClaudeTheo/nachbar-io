// Nachbar.io — GDPR-Lösch-Service (Art. 17, Single Source of Truth)
//
// Ersetzt die früheren zwei Pfade aus user-account.service.ts:
//   - requestAccountDeletion: schrieb in die NICHT existierende Tabelle `profiles`
//     → tat faktisch nichts, meldete aber Erfolg (Audit B2).
//   - deleteUser: löschte eine handgepflegte 7-Tabellen-Liste OHNE die care_*-Daten
//     → DELETE users scheiterte an der FK-Sperre, Senioren unlöschbar (Audit B3/B4).
//
// Neu: Beide Wege nutzen denselben Kern deleteUserCompletely(). Die eigentliche
// Lösch-Topologie liegt in der DB (Migration 20260529140000: FK CASCADE/SET NULL +
// RPC gdpr_delete_user). Der Service orchestriert nur RPC → auth-Löschung → Protokoll.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";

// ============================================================
// Rate Limiting (In-Memory, reicht für den geschlossenen Pilot)
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkOtpRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ============================================================
// Kern — vollständige Löschung (DSGVO Art. 17)
// ============================================================

/**
 * Löscht einen Nutzer vollständig. Single Source of Truth für alle Lösch-Pfade.
 *
 * Reihenfolge (fail-loud):
 *   1. RPC gdpr_delete_user → DELETE public.users. CASCADE räumt alle Subjekt-Daten
 *      (care_, memory_, group_ usw.), SET NULL anonymisiert Aktor-/Log-Referenzen.
 *   2. auth.admin.deleteUser → DELETE auth.users (+ rein auth-seitige CASCADE-Tabellen).
 *   3. Lösch-Protokoll in data_requests (Rechenschaftspflicht, überlebt die Löschung).
 *
 * Bricht VOR Schritt 2 ab, wenn Schritt 1 fehlschlägt — so entsteht nie ein
 * verwaister Login ohne Daten oder Daten ohne Login.
 *
 * @param adminClient Service-Role-Client (umgeht RLS, ruft die SECURITY-DEFINER-RPC).
 */
export async function deleteUserCompletely(
  adminClient: SupabaseClient,
  userId: string,
  opts: { email?: string | null } = {},
): Promise<void> {
  // 1. Personenbezogene Daten in public.* löschen/anonymisieren (eine Transaktion)
  const { error: rpcError } = await adminClient.rpc("gdpr_delete_user", {
    target_user_id: userId,
  });
  if (rpcError) {
    console.error("DSGVO-Löschung gdpr_delete_user fehlgeschlagen:", rpcError.message);
    throw new ServiceError(
      "Konto konnte nicht vollständig gelöscht werden. Bitte kontaktieren Sie den Support.",
      500,
    );
  }

  // 2. Auth-User (+ rein auth-seitige Daten) entfernen — erst nach erfolgreicher RPC
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("DSGVO-Löschung auth-user fehlgeschlagen:", authError.message);
    throw new ServiceError(
      "Konto-Anmeldedaten konnten nicht gelöscht werden. Bitte kontaktieren Sie den Support.",
      500,
    );
  }

  // 3. Lösch-Protokoll (Art. 5 Abs. 2 Rechenschaftspflicht). Best-effort: ein Fehler
  //    hier macht die bereits erfolgte Löschung nicht rückgängig.
  try {
    const nowIso = new Date().toISOString();
    await adminClient.from("data_requests").insert({
      requester_email: opts.email ?? `geloescht:${userId}`,
      request_type: "deletion",
      status: "completed",
      due_date: nowIso,
      completed_at: nowIso,
      resolution_summary:
        "Konto und personenbezogene Daten gelöscht (DSGVO Art. 17, Selbstbedienung).",
    });
  } catch (logError) {
    console.warn("DSGVO-Lösch-Protokoll konnte nicht geschrieben werden:", logError);
  }
}

// ============================================================
// Authentifizierter Pfad — POST /api/user/delete
// ============================================================

export async function deleteUserAuthenticated(
  adminClient: SupabaseClient,
  userId: string,
  confirmText: string,
): Promise<{ success: true; message: string }> {
  // Schutz gegen versehentliches Löschen
  if (confirmText !== "KONTO LÖSCHEN") {
    throw new ServiceError(
      "Bitte bestätigen Sie die Löschung mit dem korrekten Text",
      400,
    );
  }

  await deleteUserCompletely(adminClient, userId);

  return {
    success: true,
    message: "Ihr Konto und alle zugehörigen Daten wurden gelöscht.",
  };
}

// ============================================================
// Web-Pfad (OTP, ohne Session) — POST /api/account/delete-request
// Google-Play-Policy: Löschung muss auch ohne App möglich sein.
// ============================================================

export interface AccountDeletionRequestParams {
  email: string;
  action: "request" | "confirm";
  otp?: string;
}

export async function requestAccountDeletion(
  adminClient: SupabaseClient,
  params: AccountDeletionRequestParams,
): Promise<{ ok: boolean }> {
  const { email, action, otp } = params;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    throw new ServiceError("Ungültige E-Mail-Adresse", 400);
  }
  if (!action || !["request", "confirm"].includes(action)) {
    throw new ServiceError("Ungültige Aktion", 400);
  }
  if (!checkOtpRateLimit(email.toLowerCase())) {
    throw new ServiceError(
      "Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut.",
      429,
    );
  }

  if (action === "request") {
    // OTP an die E-Mail senden (kein Hinweis ob Konto existiert — Anti-Enumeration)
    await adminClient.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    return { ok: true };
  }

  // action === "confirm": OTP verifizieren und ECHT löschen (kein profiles-Soft-Delete mehr)
  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    throw new ServiceError("Ungültiger Bestätigungscode", 400);
  }

  const { data: verifyData, error: verifyError } = await adminClient.auth.verifyOtp({
    email: email.trim(),
    token: otp,
    type: "email",
  });
  if (verifyError || !verifyData?.user) {
    throw new ServiceError("Ungültiger oder abgelaufener Code", 400);
  }

  await deleteUserCompletely(adminClient, verifyData.user.id, {
    email: verifyData.user.email ?? email.trim(),
  });

  return { ok: true };
}
