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
