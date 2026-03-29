// modules/care/services/caregiver/kiosk-photos.service.ts
// Nachbar.io — Kiosk-Fotos: CRUD-Operationen (Business Logic)

import { SupabaseClient } from "@supabase/supabase-js";
import { careLog } from "@/lib/care/api-helpers";
import { ServiceError } from "@/lib/services/service-error";

const MAX_PHOTOS_PER_HOUSEHOLD = 200;
const MAX_CAPTION_LENGTH = 100;
const SIGNED_URL_EXPIRY = 3600; // 1 Stunde

// ---------- listKioskPhotos ----------

export async function listKioskPhotos(
  supabase: SupabaseClient,
  userId: string,
  householdId: string,
): Promise<{ photos: Record<string, unknown>[] }> {
  if (!householdId) {
    throw new ServiceError("household_id ist erforderlich", 400);
  }

  // Zugriffspruefung: Caregiver-Link ODER Haushaltsmitglied
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  const { data: member } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!link && !member) {
    throw new ServiceError("Kein Zugriff", 403);
  }

  // Fotos laden: Gepinnte zuerst, dann neueste zuerst
  const { data: photos, error } = await supabase
    .from("kiosk_photos")
    .select(
      "id, household_id, uploaded_by, storage_path, caption, pinned, visible, created_at",
    )
    .eq("household_id", householdId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_PHOTOS_PER_HOUSEHOLD);

  if (error) {
    throw new ServiceError("Fotos konnten nicht geladen werden", 500);
  }

  // Signed URLs generieren
  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signedUrl } = await supabase.storage
        .from("kiosk-photos")
        .createSignedUrl(photo.storage_path, SIGNED_URL_EXPIRY);

      return {
        ...photo,
        url: signedUrl?.signedUrl ?? null,
      };
    }),
  );

  return { photos: photosWithUrls };
}

// ---------- uploadKioskPhoto ----------

export interface UploadKioskPhotoInput {
  household_id: string;
  storage_path: string;
  caption?: string;
}

export async function uploadKioskPhoto(
  supabase: SupabaseClient,
  userId: string,
  input: UploadKioskPhotoInput,
): Promise<{ photo: Record<string, unknown> }> {
  const { household_id, storage_path, caption } = input;

  if (!household_id || !storage_path) {
    throw new ServiceError(
      "household_id und storage_path sind erforderlich",
      400,
    );
  }

  if (caption && caption.length > MAX_CAPTION_LENGTH) {
    throw new ServiceError(
      `Bildunterschrift darf maximal ${MAX_CAPTION_LENGTH} Zeichen lang sein`,
      400,
    );
  }

  // Zugriffspruefung: Caregiver-Link + Bewohner im Haushalt
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, resident_id")
    .eq("caregiver_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!link) {
    throw new ServiceError("Kein Zugriff als Angehöriger", 403);
  }

  const { data: memberCheck } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", household_id)
    .eq("user_id", link.resident_id)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!memberCheck) {
    throw new ServiceError("Bewohner gehört nicht zu diesem Haushalt", 403);
  }

  // Limit pruefen: max 200 Fotos pro Haushalt
  const { count } = await supabase
    .from("kiosk_photos")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household_id);

  if ((count ?? 0) >= MAX_PHOTOS_PER_HOUSEHOLD) {
    throw new ServiceError(
      `Maximale Anzahl von ${MAX_PHOTOS_PER_HOUSEHOLD} Fotos pro Haushalt erreicht`,
      409,
    );
  }

  // Foto-Metadaten anlegen
  const { data: photo, error } = await supabase
    .from("kiosk_photos")
    .insert({
      household_id,
      uploaded_by: userId,
      storage_path,
      caption: caption ?? null,
      pinned: false,
      visible: true,
    })
    .select()
    .single();

  if (error) {
    throw new ServiceError("Foto konnte nicht gespeichert werden", 500);
  }

  careLog("kiosk-photos", "create", {
    userId,
    photoId: photo.id,
    householdId: household_id,
  });

  return { photo };
}

// ---------- updateKioskPhoto ----------

export interface UpdateKioskPhotoInput {
  caption?: string;
  pinned?: boolean;
  visible?: boolean;
}

export async function updateKioskPhoto(
  supabase: SupabaseClient,
  userId: string,
  photoId: string,
  input: UpdateKioskPhotoInput,
): Promise<{ photo: Record<string, unknown> }> {
  // Validierung: mindestens ein Feld muss gesetzt sein
  if (
    input.caption === undefined &&
    input.pinned === undefined &&
    input.visible === undefined
  ) {
    throw new ServiceError(
      "Mindestens ein Feld (caption, pinned, visible) ist erforderlich",
      400,
    );
  }

  if (
    input.caption !== undefined &&
    input.caption !== null &&
    input.caption.length > MAX_CAPTION_LENGTH
  ) {
    throw new ServiceError(
      `Bildunterschrift darf maximal ${MAX_CAPTION_LENGTH} Zeichen lang sein`,
      400,
    );
  }

  // Foto laden und Besitz pruefen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_photos")
    .select("id, uploaded_by")
    .eq("id", photoId)
    .single();

  if (fetchError || !existing) {
    throw new ServiceError("Foto nicht gefunden", 404);
  }

  if (existing.uploaded_by !== userId) {
    throw new ServiceError("Nur eigene Fotos können bearbeitet werden", 403);
  }

  // Update-Objekt zusammenbauen (nur gesetzte Felder)
  const updates: Record<string, unknown> = {};
  if (input.caption !== undefined) updates.caption = input.caption;
  if (input.pinned !== undefined) updates.pinned = input.pinned;
  if (input.visible !== undefined) updates.visible = input.visible;

  const { data: photo, error: updateError } = await supabase
    .from("kiosk_photos")
    .update(updates)
    .eq("id", photoId)
    .select()
    .single();

  if (updateError) {
    throw new ServiceError("Foto konnte nicht aktualisiert werden", 500);
  }

  careLog("kiosk-photos", "update", {
    userId,
    photoId,
    fields: Object.keys(updates),
  });

  return { photo };
}

// ---------- deleteKioskPhoto ----------

export async function deleteKioskPhoto(
  supabase: SupabaseClient,
  userId: string,
  photoId: string,
): Promise<{ deleted: true }> {
  // Foto laden und Besitz pruefen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_photos")
    .select("id, uploaded_by, storage_path")
    .eq("id", photoId)
    .single();

  if (fetchError || !existing) {
    throw new ServiceError("Foto nicht gefunden", 404);
  }

  if (existing.uploaded_by !== userId) {
    throw new ServiceError("Nur eigene Fotos können gelöscht werden", 403);
  }

  // Storage-Datei loeschen
  const { error: storageError } = await supabase.storage
    .from("kiosk-photos")
    .remove([existing.storage_path]);

  if (storageError) {
    // Warnung loggen, aber Metadaten trotzdem loeschen
    console.warn(
      `[kiosk-photos] Storage-Datei konnte nicht gelöscht werden: ${existing.storage_path}`,
      storageError.message,
    );
  }

  // Metadaten loeschen
  const { error: deleteError } = await supabase
    .from("kiosk_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    throw new ServiceError("Foto konnte nicht gelöscht werden", 500);
  }

  careLog("kiosk-photos", "delete", {
    userId,
    photoId,
    storagePath: existing.storage_path,
  });

  return { deleted: true };
}
