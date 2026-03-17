// app/api/caregiver/kiosk-photos/route.ts
// Nachbar.io — Kiosk-Fotos: Auflisten und Hochladen (Caregiver / Haushaltsmitglied)

import { NextRequest } from "next/server";
import {
  requireAuth,
  errorResponse,
  successResponse,
  careLog,
} from "@/lib/care/api-helpers";

const MAX_PHOTOS_PER_HOUSEHOLD = 200;
const MAX_CAPTION_LENGTH = 100;
const SIGNED_URL_EXPIRY = 3600; // 1 Stunde

/**
 * GET /api/caregiver/kiosk-photos?household_id=...
 * Fotos eines Haushalts auflisten. Zugriff fuer Caregiver und Haushaltsmitglieder.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse("Nicht autorisiert", 401);
  const { supabase, user } = authResult;

  const householdId = request.nextUrl.searchParams.get("household_id");
  if (!householdId) {
    return errorResponse("household_id ist erforderlich", 400);
  }

  // Zugriffspruefung: Caregiver-Link ODER Haushaltsmitglied
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id")
    .eq("caregiver_id", user.id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  const { data: member } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .not("verified_at", "is", null)
    .limit(1)
    .maybeSingle();

  if (!link && !member) {
    return errorResponse("Kein Zugriff", 403);
  }

  // Fotos laden: Gepinnte zuerst, dann neueste zuerst
  const { data: photos, error } = await supabase
    .from("kiosk_photos")
    .select("id, household_id, uploaded_by, storage_path, caption, pinned, visible, created_at")
    .eq("household_id", householdId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_PHOTOS_PER_HOUSEHOLD);

  if (error) {
    return errorResponse("Fotos konnten nicht geladen werden", 500);
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
    })
  );

  return successResponse({ photos: photosWithUrls });
}

/**
 * POST /api/caregiver/kiosk-photos
 * Foto-Metadaten anlegen nach Upload. Body: { household_id, storage_path, caption? }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse("Nicht autorisiert", 401);
  const { supabase, user } = authResult;

  let body: { household_id?: string; storage_path?: string; caption?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  const { household_id, storage_path, caption } = body;

  if (!household_id || !storage_path) {
    return errorResponse("household_id und storage_path sind erforderlich", 400);
  }

  if (caption && caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(
      `Bildunterschrift darf maximal ${MAX_CAPTION_LENGTH} Zeichen lang sein`,
      400
    );
  }

  // Zugriffspruefung: Caregiver-Link + Bewohner im Haushalt
  const { data: link } = await supabase
    .from("caregiver_links")
    .select("id, resident_id")
    .eq("caregiver_id", user.id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!link) {
    return errorResponse("Kein Zugriff als Angehöriger", 403);
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
    return errorResponse("Bewohner gehört nicht zu diesem Haushalt", 403);
  }

  // Limit pruefen: max 200 Fotos pro Haushalt
  const { count } = await supabase
    .from("kiosk_photos")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household_id);

  if ((count ?? 0) >= MAX_PHOTOS_PER_HOUSEHOLD) {
    return errorResponse(
      `Maximale Anzahl von ${MAX_PHOTOS_PER_HOUSEHOLD} Fotos pro Haushalt erreicht`,
      409
    );
  }

  // Foto-Metadaten anlegen
  const { data: photo, error } = await supabase
    .from("kiosk_photos")
    .insert({
      household_id,
      uploaded_by: user.id,
      storage_path,
      caption: caption ?? null,
      pinned: false,
      visible: true,
    })
    .select()
    .single();

  if (error) {
    return errorResponse("Foto konnte nicht gespeichert werden", 500);
  }

  careLog("kiosk-photos", "create", {
    userId: user.id,
    photoId: photo.id,
    householdId: household_id,
  });

  return successResponse({ photo }, 201);
}
