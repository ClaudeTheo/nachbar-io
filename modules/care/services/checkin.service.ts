// modules/care/services/checkin.service.ts
// Nachbar.io — Check-in abgeben und Historie abrufen (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/care/audit";
import { sendCareNotification } from "@/lib/care/notifications";
import { requireCareAccess } from "@/lib/care/api-helpers";
import {
  encryptField,
  decryptFields,
  decryptFieldsArray,
  CARE_CHECKINS_ENCRYPTED_FIELDS,
} from "@/lib/care/field-encryption";
import { createCareLogger } from "@/lib/care/logger";
import { checkCareConsent } from "@/lib/care/consent";
import { getUserQuarterId } from "@/lib/quarters/helpers";
import { ServiceError } from "@/lib/services/service-error";
import type {
  CareCheckin,
  CareCheckinStatus,
  CareCheckinMood,
} from "@/lib/care/types";
import { CHECKIN_DEFAULTS } from "@/modules/care/services/constants";
import { awardPoints } from "@/modules/gamification";

// Gültige Check-in-Status-Werte für die Eingabe
const VALID_SUBMIT_STATUSES: CareCheckinStatus[] = [
  "ok",
  "not_well",
  "need_help",
];

// Status-Werte, bei denen ein bestehender Check-in aktualisiert werden kann
const PENDING_CHECKIN_STATUSES: CareCheckinStatus[] = ["reminded", "missed"];

// Gültige Mood-Werte
const VALID_MOODS: CareCheckinMood[] = ["good", "neutral", "bad"];

export interface SubmitCheckinInput {
  status?: CareCheckinStatus;
  mood?: CareCheckinMood;
  note?: string;
  scheduled_at?: string;
}

// POST-Logik: Check-in abgeben
export async function submitCheckin(
  supabase: SupabaseClient,
  userId: string,
  body: SubmitCheckinInput,
): Promise<Record<string, unknown>> {
  const log = createCareLogger("care/checkin/POST");

  // Art. 9 DSGVO: Einwilligung prüfen
  const hasConsent = await checkCareConsent(supabase, userId, "checkin");
  if (!hasConsent) {
    throw new ServiceError("Einwilligung erforderlich", 403);
  }

  const { status, mood, note, scheduled_at } = body;

  // Status ist Pflichtfeld
  if (!status) {
    throw new ServiceError("Status ist erforderlich", 400);
  }

  // Status gegen gültige Eingabe-Werte prüfen
  if (!VALID_SUBMIT_STATUSES.includes(status)) {
    throw new ServiceError(
      `Ungültiger Status: "${status}". Erlaubt: ${VALID_SUBMIT_STATUSES.join(", ")}`,
      400,
    );
  }

  // M2: mood gegen Whitelist prüfen
  if (mood && !VALID_MOODS.includes(mood)) {
    throw new ServiceError(
      `Ungültiger mood-Wert: "${mood}". Erlaubt: ${VALID_MOODS.join(", ")}`,
      400,
    );
  }

  // M3: note Längenlimit (max 2000 Zeichen)
  if (note && note.length > 2000) {
    throw new ServiceError("Notiz darf maximal 2000 Zeichen lang sein", 400);
  }

  const now = new Date().toISOString();
  let checkin: Record<string, unknown>;

  // Note verschlüsseln (Art. 9 DSGVO)
  const encryptedNote = encryptField(note ?? null);

  // Versuche, einen bestehenden ausstehenden Check-in zu aktualisieren, wenn scheduled_at angegeben
  if (scheduled_at) {
    const { data: existing, error: updateError } = await supabase
      .from("care_checkins")
      .update({
        status,
        mood: mood ?? null,
        note: encryptedNote,
        completed_at: now,
      })
      .eq("senior_id", userId)
      .eq("scheduled_at", scheduled_at)
      .in("status", PENDING_CHECKIN_STATUSES)
      .select()
      .maybeSingle();

    if (updateError) {
      log.error("db_update_failed", updateError, { userId, scheduled_at });
      log.done(500);
      throw new ServiceError("Check-in konnte nicht aktualisiert werden", 500);
    }

    if (existing) {
      // Vorhandener Check-in wurde erfolgreich aktualisiert
      checkin = existing;
    } else {
      // Kein passender ausstehender Eintrag gefunden → neuen Check-in erstellen
      const { data: newCheckin, error: insertError } = await supabase
        .from("care_checkins")
        .insert({
          senior_id: userId,
          status,
          mood: mood ?? null,
          note: encryptedNote,
          scheduled_at,
          completed_at: now,
          escalated: false,
        })
        .select()
        .single();

      if (insertError || !newCheckin) {
        log.error("db_insert_failed", insertError, { userId, scheduled_at });
        log.done(500);
        throw new ServiceError("Check-in konnte nicht gespeichert werden", 500);
      }
      checkin = newCheckin;
    }
  } else {
    // Neuen Check-in ohne geplanten Zeitpunkt anlegen
    const { data: newCheckin, error: insertError } = await supabase
      .from("care_checkins")
      .insert({
        senior_id: userId,
        status,
        mood: mood ?? null,
        note: encryptedNote,
        scheduled_at: now,
        completed_at: now,
        escalated: false,
      })
      .select()
      .single();

    if (insertError || !newCheckin) {
      log.error("db_insert_failed", insertError, { userId });
      log.done(500);
      throw new ServiceError("Check-in konnte nicht gespeichert werden", 500);
    }
    checkin = newCheckin;
  }

  log.info("checkin_submitted", {
    userId,
    checkinId: checkin.id as string,
    status,
    mood: mood ?? null,
  });

  // Gamification: Punkte fuer Check-in (fire-and-forget)
  awardPoints(supabase, userId, "checkin").catch((err) =>
    console.error("[gamification] checkin awardPoints failed:", err),
  );

  // Audit-Log schreiben: ok → checkin_ok, not_well/need_help → checkin_not_well
  const auditEventType = status === "ok" ? "checkin_ok" : "checkin_not_well";
  try {
    await writeAuditLog(supabase, {
      seniorId: userId,
      actorId: userId,
      eventType: auditEventType,
      referenceType: "care_checkins",
      referenceId: checkin.id as string,
      metadata: { status, mood: mood ?? null, hasNote: !!note },
    });
  } catch (_auditError) {
    // Audit-Fehler blockiert nicht den Check-in-Prozess
    log.warn("audit_log_failed", { checkinId: checkin.id as string });
  }

  // Bei "not_well": Angehörige benachrichtigen
  if (status === "not_well") {
    try {
      // Alle verifizierten Angehörigen abrufen, die diesem Senior zugewiesen sind
      const { data: relatives, error: relativesError } = await supabase
        .from("care_helpers")
        .select("user_id")
        .eq("role", "relative")
        .eq("verification_status", "verified")
        .contains("assigned_seniors", [userId]);

      if (relativesError) {
        log.error("relatives_query_failed", relativesError, { userId });
      } else if (relatives && relatives.length > 0) {
        const notifyPromises = relatives.map((relative) =>
          sendCareNotification(supabase, {
            userId: relative.user_id,
            type: "care_checkin_missed",
            title: "Check-in: Nicht so gut",
            body: `Ihr Angehöriger hat gemeldet, dass er sich nicht wohl fühlt.${note ? ` Hinweis: ${note}` : ""}`,
            referenceId: checkin!.id as string,
            referenceType: "care_checkins",
            url: `/care/checkin/${checkin!.id}`,
            channels: ["push", "in_app"],
          }),
        );
        await Promise.all(notifyPromises);
      }
    } catch (notifyError) {
      // Benachrichtigungsfehler blockiert nicht die Check-in-Antwort
      log.error("notification_failed", notifyError, { userId });
    }
  }

  // Bei "need_help": SOS-Alert direkt in der Datenbank anlegen
  if (status === "need_help") {
    try {
      const quarterId = await getUserQuarterId(supabase, userId);
      const { error: sosError } = await supabase
        .from("care_sos_alerts")
        .insert({
          senior_id: userId,
          category: "general_help",
          status: "triggered",
          current_escalation_level: 1,
          escalated_at: [],
          notes: encryptField(note || "Hilfe über Check-in angefordert"),
          source: "checkin_timeout",
          quarter_id: quarterId,
        });

      if (sosError) {
        log.error("auto_sos_failed", sosError, { userId });
      } else {
        log.info("auto_sos_created", { userId, source: "checkin_need_help" });
      }
    } catch (e) {
      log.error("auto_sos_exception", e, { userId });
    }
  }

  // Entschlüsselt zurückgeben
  log.done(201, { checkinId: checkin.id as string, status });
  return decryptFields(
    checkin as Record<string, unknown>,
    CARE_CHECKINS_ENCRYPTED_FIELDS,
  );
}

// GET-Logik: Check-in-Historie abrufen
export async function getCheckinHistory(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  // Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
    }
  }

  // Check-in-Historie aus der Datenbank abrufen, absteigend nach geplantem Zeitpunkt
  const { data, error } = await supabase
    .from("care_checkins")
    .select("*")
    .eq("senior_id", seniorId)
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[care/checkin] Historie-Abfrage fehlgeschlagen:", error);
    throw new ServiceError(
      "Check-in-Historie konnte nicht geladen werden",
      500,
    );
  }

  // Check-in-Notizen entschlüsseln (Art. 9 DSGVO)
  return decryptFieldsArray(data ?? [], CARE_CHECKINS_ENCRYPTED_FIELDS);
}

// Antwort-Struktur für den Status-Endpunkt
export interface CheckinStatusResponse {
  today: CareCheckin[];
  checkinTimes: string[];
  checkinEnabled: boolean;
  completedCount: number;
  totalCount: number;
  nextDue: string | null;
  allCompleted: boolean;
}

// Hilfsfunktion: Aktuelle Zeit als HH:MM formatieren
function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Hilfsfunktion: Nächsten fälligen Check-in-Zeitpunkt bestimmen
// Gibt den nächsten konfigurierten Zeitpunkt zurück, für den noch kein
// abgeschlossener Check-in heute vorliegt und der noch nicht vergangen ist.
function findNextDueTime(
  checkinTimes: string[],
  todayCheckins: CareCheckin[],
  nowTimeStr: string,
): string | null {
  // Zeitpunkte, für die bereits heute ein abgeschlossener Check-in vorliegt
  const completedTimes = new Set(
    todayCheckins
      .filter((c) => c.completed_at !== null && c.status !== "missed")
      .map((c) => formatTimeHHMM(new Date(c.scheduled_at))),
  );

  // Sortierte Zeiten durchlaufen und ersten noch ausstehenden zurückgeben
  const sortedTimes = [...checkinTimes].sort();
  for (const time of sortedTimes) {
    if (completedTimes.has(time)) continue;
    // Noch nicht vergangener Zeitpunkt → als nächsten fälligen zurückgeben
    if (time >= nowTimeStr) return time;
  }

  // Alle heutigen Zeiten sind entweder erledigt oder vergangen
  return null;
}

// GET-Logik: Heutigen Check-in-Status eines Seniors abrufen
export async function getTodayCheckinStatus(
  supabase: SupabaseClient,
  userId: string,
  seniorId: string,
): Promise<CheckinStatusResponse> {
  // Zugriffsprüfung: Nur Senior selbst, zugewiesene Helfer oder Admins
  if (seniorId !== userId) {
    const role = await requireCareAccess(supabase, seniorId);
    if (!role) {
      throw new ServiceError("Kein Zugriff auf diesen Senior", 403);
    }
  }

  // Tagesgrenzen berechnen: heute 00:00 bis morgen 00:00 (ISO-Format)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  // Heutige Check-ins und Care-Profil parallel abrufen
  const [checkinsResult, profileResult] = await Promise.all([
    supabase
      .from("care_checkins")
      .select("*")
      .eq("senior_id", seniorId)
      .gte("scheduled_at", todayStart.toISOString())
      .lt("scheduled_at", tomorrowStart.toISOString())
      .order("scheduled_at", { ascending: true }),

    supabase
      .from("care_profiles")
      .select("checkin_times, checkin_enabled")
      .eq("user_id", seniorId)
      .maybeSingle(),
  ]);

  if (checkinsResult.error) {
    console.error(
      "[care/checkin/status] Check-in-Abfrage fehlgeschlagen:",
      checkinsResult.error,
    );
    throw new ServiceError("Check-in-Status konnte nicht geladen werden", 500);
  }

  if (profileResult.error) {
    console.error(
      "[care/checkin/status] Profil-Abfrage fehlgeschlagen:",
      profileResult.error,
    );
    throw new ServiceError("Care-Profil konnte nicht geladen werden", 500);
  }

  // Check-in-Notizen entschlüsseln (Art. 9 DSGVO)
  const todayCheckins: CareCheckin[] = decryptFieldsArray(
    checkinsResult.data ?? [],
    CARE_CHECKINS_ENCRYPTED_FIELDS,
  ) as CareCheckin[];

  // Check-in-Zeiten und Aktivierungsstatus aus dem Profil oder Defaults laden
  const checkinTimes: string[] = profileResult.data?.checkin_times ?? [
    ...CHECKIN_DEFAULTS.defaultTimes,
  ];
  const checkinEnabled: boolean = profileResult.data?.checkin_enabled ?? true;

  // Anzahl abgeschlossener Check-ins (completed_at ist gesetzt, Status nicht 'missed')
  const completedCount = todayCheckins.filter(
    (c) => c.completed_at !== null && c.status !== "missed",
  ).length;

  const totalCount = checkinTimes.length;

  // Nächsten fälligen Check-in-Zeitpunkt ermitteln
  const nowTimeStr = formatTimeHHMM(new Date());
  const nextDue = findNextDueTime(checkinTimes, todayCheckins, nowTimeStr);

  const allCompleted =
    checkinEnabled && completedCount >= totalCount && totalCount > 0;

  return {
    today: todayCheckins,
    checkinTimes,
    checkinEnabled,
    completedCount,
    totalCount,
    nextDue,
    allCompleted,
  };
}
