// Senior-Kiosk-Service (Welle SB)
// Liest die Familienfotos des eigenen Haushalts fuer den Senior-Bildschirm.
// Wird mit einem User-Kontext-SupabaseClient aufgerufen — die Haushalts-Scoping
// uebernimmt die RLS-Policy aus SB-1 (verifizierte Haushaltsmitglieder lesen
// sichtbare kiosk_photos ihres Haushalts). Kein household_id-Filter noetig:
// RLS liefert ausschliesslich die eigenen, sichtbaren Fotos.
//
// Signed-URL-Muster bewusst identisch zu lib/services/device.service.getDevicePhotos
// (Bucket "kiosk-photos", createSignedUrl) — ein gemeinsames Lesemuster.

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { safeInsertNotification } from "@/lib/notifications-server";
import { sendPush } from "@/modules/care/services/channels/push";

export interface SeniorPhoto {
  id: string;
  /** kurzlebige Signed-URL; null wenn die Signierung scheitert (Foto wird dann ausgelassen) */
  url: string | null;
  caption: string | null;
  /** users.id des Hochladenden — Ziel der Ein-Tap-Sprachantwort (SB-2) */
  uploaderId: string;
  createdAt: string;
  pinned: boolean;
}

const SIGNED_URL_TTL_SEC = 21600; // 6 Stunden, wie device.service

/**
 * Sichtbare Familienfotos des eigenen Haushalts (RLS-scoped), neueste zuerst,
 * gepinnte vorne. Mit kurzlebigen Signed-URLs.
 */
export async function getSeniorHouseholdPhotos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  opts: { limit?: number } = {},
): Promise<SeniorPhoto[]> {
  const limit = opts.limit ?? 50;

  const { data: photos, error } = await supabase
    .from("kiosk_photos")
    .select("id, storage_path, caption, pinned, uploaded_by, created_at")
    .eq("visible", true)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !photos) {
    if (error) {
      console.error("[senior-kiosk] Foto-Abfrage fehlgeschlagen:", error.message);
    }
    return [];
  }

  return Promise.all(
    photos.map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from("kiosk-photos")
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SEC);
      return {
        id: photo.id,
        url: signed?.signedUrl ?? null,
        caption: photo.caption,
        uploaderId: photo.uploaded_by,
        createdAt: photo.created_at,
        pinned: photo.pinned,
      };
    }),
  );
}

export interface SeniorSticky {
  id: string;
  title: string;
  createdAt: string;
}

/**
 * Offene Sticky-Notes des eigenen Haushalts (RLS-scoped, SB-1), neueste zuerst.
 * Nur Stickies, keine Termine; nur noch nicht quittierte (acknowledged_at IS NULL).
 */
export async function getSeniorHouseholdStickies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  opts: { limit?: number } = {},
): Promise<SeniorSticky[]> {
  const { data, error } = await supabase
    .from("kiosk_reminders")
    .select("id, title, created_at")
    .eq("type", "sticky")
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 20);

  if (error || !data) {
    if (error) {
      console.error("[senior-kiosk] Sticky-Abfrage fehlgeschlagen:", error.message);
    }
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
  }));
}

/**
 * „Gesehen"-Quittung eines Sticky/Reminders (Welle SB-4).
 *
 * Laeuft mit dem ADMIN-Client (RLS-UPDATE auf kiosk_reminders ist bewusst nicht
 * geoeffnet — nur created_by darf via RLS schreiben). Stattdessen eigene Checks:
 *   - Reminder muss existieren (sonst 404)
 *   - User muss verifiziertes Mitglied des Reminder-Haushalts sein (sonst 403)
 *   - Reminder darf noch nicht quittiert sein (sonst 409; IS-NULL-Guard im UPDATE
 *     schuetzt zusaetzlich gegen Doppel-Ack-Race)
 * Erfolg -> Quittung an created_by als Push + Notification, OHNE Zettel-Inhalt
 * (Datensparsamkeit). created_by == User (Selbst-Quittung) -> keine Quittung.
 */
export async function acknowledgeSeniorReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, "public", any>,
  userId: string,
  reminderId: string,
): Promise<{ acknowledged: true }> {
  const { data: reminder } = await admin
    .from("kiosk_reminders")
    .select("id, household_id, created_by, type, acknowledged_at")
    .eq("id", reminderId)
    .maybeSingle();

  if (!reminder) {
    throw new ServiceError("Zettel nicht gefunden", 404, "reminder_not_found");
  }

  const { data: membership } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", reminder.household_id)
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .maybeSingle();

  if (!membership) {
    throw new ServiceError("Keine Berechtigung", 403, "not_household_member");
  }

  if (reminder.acknowledged_at) {
    throw new ServiceError("Bereits bestaetigt", 409, "already_acknowledged");
  }

  const { data: updated, error: updateError } = await admin
    .from("kiosk_reminders")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", reminderId)
    .is("acknowledged_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    // Race: in der Zwischenzeit hat jemand anderes quittiert
    throw new ServiceError("Bereits bestaetigt", 409, "already_acknowledged");
  }

  // Quittung an den Ersteller — OHNE Zettel-Inhalt (Datensparsamkeit).
  // Best-effort: ein fehlgeschlagener Push macht die Quittung nicht rueckgaengig.
  if (reminder.created_by && reminder.created_by !== userId) {
    const title = "Ihr Zettel wurde gesehen ❤";
    await safeInsertNotification(admin, {
      user_id: reminder.created_by,
      type: "system",
      title,
      reference_id: reminderId,
      reference_type: "kiosk_reminders",
    });
    await sendPush(admin, {
      userId: reminder.created_by,
      title,
      body: "Ihre Nachricht wurde gesehen.",
      tag: `kiosk-reminder-ack-${reminderId}`,
    });
  }

  return { acknowledged: true };
}
