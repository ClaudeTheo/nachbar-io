// app/api/caregiver/kiosk-photos/[id]/route.ts
// Nachbar.io — Einzelnes Kiosk-Foto: Bearbeiten und Löschen (nur eigene Fotos)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
  successResponse,
  careLog,
} from "@/lib/care/api-helpers";

const MAX_CAPTION_LENGTH = 100;

/**
 * PATCH /api/caregiver/kiosk-photos/[id]
 * Foto-Metadaten aktualisieren (caption, pinned, visible). Nur eigene Fotos.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const { id } = await params;

  let body: { caption?: string; pinned?: boolean; visible?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  // Validierung: mindestens ein Feld muss gesetzt sein
  if (body.caption === undefined && body.pinned === undefined && body.visible === undefined) {
    return errorResponse("Mindestens ein Feld (caption, pinned, visible) ist erforderlich", 400);
  }

  if (body.caption !== undefined && body.caption !== null && body.caption.length > MAX_CAPTION_LENGTH) {
    return errorResponse(
      `Bildunterschrift darf maximal ${MAX_CAPTION_LENGTH} Zeichen lang sein`,
      400
    );
  }

  // Foto laden und Besitz prüfen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_photos")
    .select("id, uploaded_by")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("Foto nicht gefunden", 404);
  }

  if (existing.uploaded_by !== user.id) {
    return errorResponse("Nur eigene Fotos können bearbeitet werden", 403);
  }

  // Update-Objekt zusammenbauen (nur gesetzte Felder)
  const updates: Record<string, unknown> = {};
  if (body.caption !== undefined) updates.caption = body.caption;
  if (body.pinned !== undefined) updates.pinned = body.pinned;
  if (body.visible !== undefined) updates.visible = body.visible;

  const { data: photo, error: updateError } = await supabase
    .from("kiosk_photos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return errorResponse("Foto konnte nicht aktualisiert werden", 500);
  }

  careLog("kiosk-photos", "update", {
    userId: user.id,
    photoId: id,
    fields: Object.keys(updates),
  });

  return successResponse({ photo });
}

/**
 * DELETE /api/caregiver/kiosk-photos/[id]
 * Foto-Metadaten und Storage-Datei löschen. Nur eigene Fotos.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Subscription-Gate: Plus erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'plus');
  if (sub instanceof NextResponse) return sub;

  const { supabase, user } = auth;

  const { id } = await params;

  // Foto laden und Besitz prüfen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_photos")
    .select("id, uploaded_by, storage_path")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("Foto nicht gefunden", 404);
  }

  if (existing.uploaded_by !== user.id) {
    return errorResponse("Nur eigene Fotos können gelöscht werden", 403);
  }

  // Storage-Datei löschen
  const { error: storageError } = await supabase.storage
    .from("kiosk-photos")
    .remove([existing.storage_path]);

  if (storageError) {
    // Warnung loggen, aber Metadaten trotzdem löschen
    console.warn(
      `[kiosk-photos] Storage-Datei konnte nicht gelöscht werden: ${existing.storage_path}`,
      storageError.message
    );
  }

  // Metadaten löschen
  const { error: deleteError } = await supabase
    .from("kiosk_photos")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return errorResponse("Foto konnte nicht gelöscht werden", 500);
  }

  careLog("kiosk-photos", "delete", {
    userId: user.id,
    photoId: id,
    storagePath: existing.storage_path,
  });

  return successResponse({ deleted: true });
}
