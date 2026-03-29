// Nachbar.io — Doctors-Service
// Zentralisiert Business-Logik fuer Arzt-Profile und Bewertungen (Pro Medical).
// Extrahiert aus: api/doctors, api/doctors/[id], api/doctors/[id]/reviews

import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceError } from "@/lib/services/service-error";
import { validateDoctorProfile, validateReview } from "@/lib/doctors";

// ============================================================
// Ärzte-Liste (GET /api/doctors)
// ============================================================

export interface ListDoctorsParams {
  quarterId?: string | null;
  specialization?: string | null;
}

/**
 * Laedt alle sichtbaren Arzt-Profile mit optionaler Filterung.
 */
export async function listDoctors(
  supabase: SupabaseClient,
  params: ListDoctorsParams,
) {
  let query = supabase
    .from("doctor_profiles")
    .select(
      "id, user_id, specialization, bio, avatar_url, visible, accepts_new_patients, video_consultation, quarter_ids, created_at",
    )
    .eq("visible", true)
    .order("created_at", { ascending: false });

  // Filter: Quartier (quarter_ids enthaelt die gesuchte UUID)
  if (params.quarterId) {
    query = query.contains("quarter_ids", [params.quarterId]);
  }

  // Filter: Fachgebiet (specialization enthaelt den gesuchten String)
  if (params.specialization) {
    query = query.contains("specialization", [params.specialization]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[doctors] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Ärzte konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

// ============================================================
// Einzelnes Arzt-Profil (GET /api/doctors/[id])
// ============================================================

/**
 * Laedt ein einzelnes Arzt-Profil. Nicht-sichtbare Profile nur fuer den Arzt selbst.
 */
export async function getDoctorProfile(
  supabase: SupabaseClient,
  doctorId: string,
) {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(
      "id, user_id, specialization, bio, avatar_url, visible, accepts_new_patients, video_consultation, quarter_ids, created_at",
    )
    .eq("id", doctorId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new ServiceError("Arzt-Profil nicht gefunden", 404);
    }
    console.error("[doctors] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // Nicht-sichtbare Profile nur fuer den Arzt selbst anzeigen
  if (!data.visible) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== data.user_id) {
      throw new ServiceError("Arzt-Profil nicht gefunden", 404);
    }
  }

  return data;
}

// ============================================================
// Arzt-Profil aktualisieren (PATCH /api/doctors/[id])
// ============================================================

/**
 * Aktualisiert ein Arzt-Profil. Nur der Arzt selbst darf sein Profil aendern.
 */
export async function updateDoctorProfile(
  supabase: SupabaseClient,
  userId: string,
  doctorId: string,
  body: Record<string, unknown>,
) {
  // Bestehendes Profil laden
  const { data: existing, error: fetchError } = await supabase
    .from("doctor_profiles")
    .select("id, user_id")
    .eq("id", doctorId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new ServiceError("Arzt-Profil nicht gefunden", 404);
    }
    throw new ServiceError("Abfrage fehlgeschlagen", 500);
  }

  // Zugriffspruefung: Nur der Arzt selbst darf sein Profil aendern
  if (existing.user_id !== userId) {
    throw new ServiceError("Nur der Arzt selbst darf sein Profil ändern", 403);
  }

  // Validierung
  const validation = validateDoctorProfile(body);
  if (!validation.valid) {
    throw new ServiceError(validation.error!, 400);
  }

  // Update-Objekt zusammenbauen (nur erlaubte Felder)
  const allowedFields = [
    "specialization",
    "bio",
    "avatar_url",
    "visible",
    "accepts_new_patients",
    "video_consultation",
    "quarter_ids",
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ServiceError("Keine Änderungen angegeben", 400);
  }

  const { data: profile, error: updateError } = await supabase
    .from("doctor_profiles")
    .update(updates)
    .eq("id", doctorId)
    .select()
    .single();

  if (updateError) {
    console.error("[doctors] Update fehlgeschlagen:", updateError);
    throw new ServiceError("Profil konnte nicht aktualisiert werden", 500);
  }

  return profile;
}

// ============================================================
// Arzt-Bewertungen auflisten (GET /api/doctors/[id]/reviews)
// ============================================================

/**
 * Laedt alle sichtbaren Bewertungen eines Arztes.
 */
export async function listDoctorReviews(
  supabase: SupabaseClient,
  doctorId: string,
) {
  // Pruefen ob der Arzt existiert
  const { data: doctor, error: doctorError } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("id", doctorId)
    .single();

  if (doctorError || !doctor) {
    throw new ServiceError("Arzt-Profil nicht gefunden", 404);
  }

  // Nur sichtbare Bewertungen laden
  const { data, error } = await supabase
    .from("doctor_reviews")
    .select("id, doctor_id, patient_id, rating, text, visible, created_at")
    .eq("doctor_id", doctorId)
    .eq("visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[doctor-reviews] Abfrage fehlgeschlagen:", error);
    throw new ServiceError("Bewertungen konnten nicht geladen werden", 500);
  }

  return data ?? [];
}

// ============================================================
// Arzt-Bewertung erstellen (POST /api/doctors/[id]/reviews)
// ============================================================

/**
 * Erstellt eine Bewertung fuer einen Arzt. Max 1 pro Patient, keine Selbstbewertung.
 */
export async function createDoctorReview(
  supabase: SupabaseClient,
  userId: string,
  doctorId: string,
  body: Record<string, unknown>,
) {
  // Pruefen ob der Arzt existiert
  const { data: doctor, error: doctorError } = await supabase
    .from("doctor_profiles")
    .select("id, user_id")
    .eq("id", doctorId)
    .single();

  if (doctorError || !doctor) {
    throw new ServiceError("Arzt-Profil nicht gefunden", 404);
  }

  // Arzt darf sich nicht selbst bewerten
  if (doctor.user_id === userId) {
    throw new ServiceError("Sie können sich nicht selbst bewerten", 400);
  }

  // Validierung
  const validation = validateReview(body);
  if (!validation.valid) {
    throw new ServiceError(validation.error!, 400);
  }

  // Bewertung einfuegen (UNIQUE constraint doctor_id + patient_id)
  const insertData = {
    doctor_id: doctorId,
    patient_id: userId,
    rating: body.rating as number,
    text: (body.text as string) ?? null,
    visible: true,
  };

  const { data: review, error: insertError } = await supabase
    .from("doctor_reviews")
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    // UNIQUE constraint violation (23505) — Bewertung existiert bereits
    if (insertError.code === "23505") {
      throw new ServiceError("Sie haben diesen Arzt bereits bewertet", 409);
    }
    console.error(
      "[doctor-reviews] Bewertung konnte nicht erstellt werden:",
      insertError,
    );
    throw new ServiceError("Bewertung konnte nicht erstellt werden", 500);
  }

  return review;
}
