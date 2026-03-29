// Nachbar.io — Device Service (Wave 5b)
// Extrahierte Geschaeftslogik fuer alle 8 Device-Routen.
// Reine Funktionen mit SupabaseClient als Parameter, werfen ServiceError.

import { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { getWeather } from "@/lib/device/weather";
import { encryptField } from "@/lib/care/field-encryption";

// ---------- Typen ----------

/** Device-Objekt wie von authenticateDevice() zurueckgegeben */
export interface DeviceAuth {
  id: string;
  household_id: string;
}

/** Heartbeat-Payload aus dem Request-Body */
export interface HeartbeatPayload {
  ram_percent: unknown;
  cpu_temp: unknown;
  restart_count?: unknown;
}

// ---------- Hilfsfunktionen (aus device/status extrahiert) ----------

/** Kategorie-Labels fuer Device-News */
const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: "Infrastruktur",
  events: "Veranstaltung",
  administration: "Verwaltung",
  weather: "Wetter",
  waste: "Entsorgung",
  other: "Sonstiges",
};

/** Tageszeit-abhaengige Begruessung (Berlin-Timezone) */
function getGreeting(): string {
  const berlinTime = new Date().toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(berlinTime, 10);
  if (hour >= 22 || hour < 5) return "Gute Nacht";
  if (hour < 10) return "Guten Morgen";
  if (hour < 14) return "Guten Tag";
  if (hour < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

/** UUID-Format validieren */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- 1. GET /api/device/status ----------

export async function getDeviceStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
) {
  // User-ID + Name des Haushalt-Eigentuemers ermitteln
  const { data: member } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const userId = member?.user_id ?? null;

  // Display-Name des Nutzers laden
  let userName = "";
  if (userId) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", userId)
      .single();
    userName = userProfile?.display_name ?? "";
  }

  // Notfall-Kategorien
  const emergencyCategories = ["fire", "health_concern", "medical", "crime"];

  // Heutiges Datum in Berlin-Timezone (nicht UTC) fuer korrekte Tagesgrenze
  const todayBerlin = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  }); // YYYY-MM-DD

  // Parallele Abfragen (inkl. Welle-2-Daten: Fotos + Erinnerungen)
  const [
    weather,
    alertsResult,
    careCheckinResult,
    legacyCheckinResult,
    newsResult,
    photosCountResult,
    remindersResult,
  ] = await Promise.all([
    getWeather(),

    // Offene Alerts im Quartier (letzte 24h)
    supabase
      .from("alerts")
      .select(
        "id, category, title, description, status, is_emergency, created_at",
      )
      .in("status", ["open", "helping"])
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("created_at", { ascending: false })
      .limit(10),

    // Care-Checkin heute (neues System)
    userId
      ? supabase
          .from("care_checkins")
          .select("id, status, completed_at, scheduled_at")
          .eq("senior_id", userId)
          .not("completed_at", "is", null)
          .gte("completed_at", todayBerlin)
          .order("completed_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null, error: null }),

    // Fallback: Legacy senior_checkins
    supabase
      .from("senior_checkins")
      .select("id, checked_in_at")
      .eq("user_id", device.household_id)
      .gte("checked_in_at", todayBerlin)
      .order("checked_in_at", { ascending: false })
      .limit(1),

    // Quartiernews (Relevanz >= 5, letzte 14 Tage)
    supabase
      .from("news_items")
      .select(
        "id, original_title, ai_summary, category, relevance_score, published_at, created_at",
      )
      .gte("relevance_score", 5)
      .gte(
        "created_at",
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(5),

    // Welle 2: Anzahl sichtbarer Fotos
    supabase
      .from("kiosk_photos")
      .select("id", { count: "exact", head: true })
      .eq("household_id", device.household_id)
      .eq("visible", true),

    // Welle 2: Aktive Erinnerungen (Stickies + Termine)
    supabase
      .from("kiosk_reminders")
      .select("id, type")
      .eq("household_id", device.household_id)
      .is("acknowledged_at", null)
      .limit(50),
  ]);

  // DB-Fehler loggen (nicht-fatal)
  if (alertsResult.error)
    console.error(
      "[device/status] Alerts-Abfrage fehlgeschlagen:",
      alertsResult.error.message,
    );
  if (careCheckinResult?.error)
    console.error(
      "[device/status] Care-Checkin-Abfrage fehlgeschlagen:",
      careCheckinResult.error.message,
    );
  if (legacyCheckinResult.error)
    console.error(
      "[device/status] Legacy-Checkin-Abfrage fehlgeschlagen:",
      legacyCheckinResult.error.message,
    );
  if (newsResult.error)
    console.error(
      "[device/status] News-Abfrage fehlgeschlagen:",
      newsResult.error.message,
    );

  const alerts = (alertsResult.data || []).map(
    (a: Record<string, unknown>) => ({
      id: a.id,
      category: a.category,
      title: a.title || a.category,
      body: a.description || "",
      isEmergency:
        a.is_emergency || emergencyCategories.includes(a.category as string),
      createdAt: a.created_at,
    }),
  );

  // Check-in: Care-System hat Vorrang, sonst Legacy
  const careCheckinData = careCheckinResult?.data as
    | {
        id: string;
        status: string;
        completed_at: string;
        scheduled_at: string;
      }[]
    | null;
  const legacyCheckin = legacyCheckinResult.data?.[0]?.checked_in_at || null;
  const lastCheckin =
    careCheckinData && careCheckinData.length > 0
      ? careCheckinData[0].completed_at
      : legacyCheckin;

  // News fuer das Device aufbereiten
  const news = (newsResult.data || []).map((n: Record<string, unknown>) => ({
    id: n.id,
    title: n.original_title,
    summary: n.ai_summary,
    category: n.category,
    categoryLabel: CATEGORY_LABELS[n.category as string] ?? "Sonstiges",
    relevance: n.relevance_score,
    publishedAt: n.published_at ?? n.created_at,
  }));

  // Welle 2: Zaehler aufbereiten
  const remindersData = remindersResult.data ?? [];
  const photosCount = photosCountResult.count ?? 0;
  const remindersCount = remindersData.length;
  const stickiesCount = remindersData.filter(
    (r: { type: string }) => r.type === "sticky",
  ).length;
  const appointmentsToday = remindersData.filter(
    (r: { type: string }) => r.type === "appointment",
  ).length;

  return {
    weather,
    alerts,
    lastCheckin,
    nextAppointment: null,
    unreadCount: alerts.length,
    news,
    newsCount: news.length,
    userName,
    greeting: getGreeting(),
    // Welle 2
    photosCount,
    remindersCount,
    stickiesCount,
    appointmentsToday,
  };
}

// ---------- 2. POST /api/device/checkin ----------

export async function submitDeviceCheckin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
) {
  const now = new Date().toISOString();

  // User-ID des Haushalt-Eigentuemers ermitteln (fuer Care-Checkin)
  const { data: member } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id)
    .not("verified_at", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const userId = member?.user_id ?? null;
  let careCheckinOk = false;

  // Care-Checkin im neuen System erstellen (care_checkins Tabelle)
  if (userId) {
    const { error: careError } = await supabase.from("care_checkins").insert({
      senior_id: userId,
      status: "ok",
      mood: "good",
      note: encryptField("Wecker bestätigt via reTerminal E1001"),
      scheduled_at: now,
      completed_at: now,
      escalated: false,
    });

    if (!careError) {
      careCheckinOk = true;

      // Audit-Log schreiben
      try {
        await supabase.from("care_audit_log").insert({
          senior_id: userId,
          actor_id: userId,
          event_type: "checkin_ok",
          reference_type: "care_checkins",
          metadata: { source: "reTerminal_E1001", device_id: device.id },
        });
      } catch (err) {
        // Audit-Fehler blockiert nicht den Check-in
        console.error("[device/checkin] Audit-Log fehlgeschlagen:", err);
      }
    } else {
      console.error("[device/checkin] Care-Checkin fehlgeschlagen:", careError);
    }
  }

  // Legacy-Checkin in senior_checkins (Abwaertskompatibilitaet)
  const { error: legacyError } = await supabase.from("senior_checkins").insert({
    user_id: device.household_id,
    checked_in_at: now,
  });

  if (!careCheckinOk && legacyError) {
    throw new ServiceError("Check-in fehlgeschlagen", 500);
  }

  return {
    success: true,
    checkedInAt: now,
    careCheckin: careCheckinOk,
  };
}

// ---------- 3. POST /api/device/heartbeat ----------

export async function submitDeviceHeartbeat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
  body: HeartbeatPayload,
) {
  // Payload validieren
  const ramPercent = body.ram_percent;
  const cpuTemp = body.cpu_temp;
  const restartCount = body.restart_count ?? 0;

  if (typeof ramPercent !== "number" || ramPercent < 0 || ramPercent > 100) {
    throw new ServiceError("ram_percent muss zwischen 0 und 100 liegen", 400);
  }
  if (
    typeof cpuTemp !== "number" ||
    !Number.isFinite(cpuTemp) ||
    cpuTemp < -40 ||
    cpuTemp > 150
  ) {
    throw new ServiceError(
      "cpu_temp muss eine endliche Zahl zwischen -40 und 150 sein",
      400,
    );
  }
  if (
    typeof restartCount !== "number" ||
    !Number.isInteger(restartCount) ||
    restartCount < 0 ||
    restartCount > 32767
  ) {
    throw new ServiceError(
      "restart_count muss eine nicht-negative Ganzzahl sein (max 32767)",
      400,
    );
  }

  // Heartbeat in DB speichern
  const { error } = await supabase.from("device_heartbeats").insert({
    device_token_id: device.id,
    ram_percent: Math.round(ramPercent),
    cpu_temp_celsius: cpuTemp,
    restart_count: restartCount,
  });

  if (error) {
    console.error("[device/heartbeat] Insert fehlgeschlagen:", error);
    throw new ServiceError("Heartbeat speichern fehlgeschlagen", 500);
  }

  return { ok: true };
}

// ---------- 4. GET /api/device/contacts ----------

export async function getDeviceContacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
) {
  // Bewohner des Haushalts finden
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", device.household_id);

  const residentIds = (members ?? []).map(
    (m: { user_id: string }) => m.user_id,
  );

  if (residentIds.length === 0) {
    return { contacts: [] };
  }

  // Aktive Caregiver-Links mit User-Daten joinen
  const { data: links } = await supabase
    .from("caregiver_links")
    .select(
      `
      id,
      caregiver_id,
      auto_answer_allowed,
      auto_answer_start,
      auto_answer_end,
      users!caregiver_links_caregiver_id_fkey(display_name, avatar_url)
    `,
    )
    .in("resident_id", residentIds)
    .is("revoked_at", null);

  const contacts = (links ?? []).map((link: Record<string, unknown>) => {
    const user = link.users as {
      display_name?: string;
      avatar_url?: string | null;
    } | null;
    return {
      id: link.id,
      caregiver_id: link.caregiver_id,
      caregiver_name: user?.display_name ?? "Unbekannt",
      caregiver_avatar: user?.avatar_url ?? null,
      auto_answer_allowed: link.auto_answer_allowed,
      auto_answer_start: link.auto_answer_start,
      auto_answer_end: link.auto_answer_end,
    };
  });

  return { contacts };
}

// ---------- 5. GET /api/device/photos ----------

export async function getDevicePhotos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
) {
  const { data: photos, error } = await supabase
    .from("kiosk_photos")
    .select("id, storage_path, caption, pinned, created_at")
    .eq("household_id", device.household_id)
    .eq("visible", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[device/photos] Fehler:", error.message);
    return { photos: [] };
  }

  // Signierte URLs (6 Stunden)
  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("kiosk-photos")
        .createSignedUrl(photo.storage_path, 21600);
      return {
        id: photo.id,
        url: signed?.signedUrl ?? null,
        caption: photo.caption,
        pinned: photo.pinned,
        createdAt: photo.created_at,
      };
    }),
  );

  return { photos: photosWithUrls };
}

// ---------- 6. POST /api/device/alert-ack ----------

export async function acknowledgeDeviceAlert(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
  alertId: unknown,
) {
  if (!alertId || typeof alertId !== "string") {
    throw new ServiceError("alertId fehlt oder ungültig", 400);
  }

  // UUID-Format validieren
  if (!UUID_REGEX.test(alertId)) {
    throw new ServiceError("alertId muss eine gültige UUID sein", 400);
  }

  // Alert als gesehen markieren
  const { error: ackError } = await supabase.from("alert_responses").insert({
    alert_id: alertId,
    household_id: device.household_id,
    response_type: "seen",
    note: "Gesehen via reTerminal E1001",
  });

  if (ackError) {
    throw new ServiceError("Bestätigung fehlgeschlagen", 500);
  }

  return { success: true };
}

// ---------- 7. POST /api/device/reminder-ack ----------

export async function acknowledgeDeviceReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
  reminderId: unknown,
) {
  if (!reminderId) {
    throw new ServiceError("reminderId erforderlich", 400);
  }

  if (typeof reminderId !== "string" || !UUID_REGEX.test(reminderId)) {
    throw new ServiceError("Ungültiges Format", 400);
  }

  const { data, error } = await supabase
    .from("kiosk_reminders")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", reminderId)
    .eq("household_id", device.household_id)
    .is("acknowledged_at", null)
    .select("id")
    .single();

  if (error || !data) {
    throw new ServiceError("Erinnerung nicht gefunden", 404);
  }

  return { acknowledged: true };
}

// ---------- 8. GET /api/device/reminders ----------

export async function getDeviceReminders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  device: DeviceAuth,
) {
  const now = new Date().toISOString();

  // Aktive Sticky Notes (nicht bestaetigt)
  const { data: stickies } = await supabase
    .from("kiosk_reminders")
    .select("id, title, created_at")
    .eq("household_id", device.household_id)
    .eq("type", "sticky")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  // Anstehende Termine (naechste 7 Tage, nicht abgelaufen)
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: appointments } = await supabase
    .from("kiosk_reminders")
    .select("id, title, scheduled_at, expires_at")
    .eq("household_id", device.household_id)
    .eq("type", "appointment")
    .is("acknowledged_at", null)
    .gte("scheduled_at", now)
    .lte("scheduled_at", in7Days)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  // Naechster Termin innerhalb 15 Minuten (fuer Popup)
  const in15Min = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const upcomingPopup =
    (appointments ?? []).find(
      (a) => a.scheduled_at && a.scheduled_at <= in15Min,
    ) ?? null;

  return {
    stickies: stickies ?? [],
    appointments: appointments ?? [],
    upcomingPopup,
  };
}
