// app/api/caregiver/kiosk-reminders/[id]/route.ts
// Nachbar.io — Einzelne Kiosk-Erinnerung: Bearbeiten und Löschen (nur eigene)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
  errorResponse,
  successResponse,
  careLog,
} from "@/lib/care/api-helpers";

const MAX_TITLE_LENGTH = 80;

/**
 * PATCH /api/caregiver/kiosk-reminders/[id]
 * Erinnerung aktualisieren (title, scheduled_at). Nur eigene Erinnerungen (created_by = user.id).
 * Bei Änderung von scheduled_at wird expires_at neu berechnet.
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

  let body: { title?: string; scheduled_at?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiger Request-Body", 400);
  }

  // Validierung: mindestens ein Feld muss gesetzt sein
  if (body.title === undefined && body.scheduled_at === undefined) {
    return errorResponse(
      "Mindestens ein Feld (title, scheduled_at) ist erforderlich",
      400
    );
  }

  // Titel-Länge validieren falls angegeben
  if (body.title !== undefined && (body.title.length < 1 || body.title.length > MAX_TITLE_LENGTH)) {
    return errorResponse(
      `Titel muss zwischen 1 und ${MAX_TITLE_LENGTH} Zeichen lang sein`,
      400
    );
  }

  // scheduled_at validieren falls angegeben
  if (body.scheduled_at !== undefined && body.scheduled_at !== null && isNaN(Date.parse(body.scheduled_at))) {
    return errorResponse("scheduled_at ist kein gültiges Datum", 400);
  }

  // Erinnerung laden und Besitz prüfen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_reminders")
    .select("id, created_by, type")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("Erinnerung nicht gefunden", 404);
  }

  if (existing.created_by !== user.id) {
    return errorResponse("Nur eigene Erinnerungen können bearbeitet werden", 403);
  }

  // Update-Objekt zusammenbauen (nur gesetzte Felder)
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.scheduled_at !== undefined) {
    updates.scheduled_at = body.scheduled_at;

    // expires_at neu berechnen für Termine
    if (existing.type === "appointment" && body.scheduled_at) {
      const expires = new Date(body.scheduled_at);
      expires.setTime(expires.getTime() + 60 * 60 * 1000); // +1 Stunde
      updates.expires_at = expires.toISOString();
    } else if (body.scheduled_at === null) {
      updates.expires_at = null;
    }
  }

  const { data: reminder, error: updateError } = await supabase
    .from("kiosk_reminders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return errorResponse("Erinnerung konnte nicht aktualisiert werden", 500);
  }

  careLog("kiosk-reminders", "update", {
    userId: user.id,
    reminderId: id,
    fields: Object.keys(updates),
  });

  return successResponse({ reminder });
}

/**
 * DELETE /api/caregiver/kiosk-reminders/[id]
 * Erinnerung löschen. Nur eigene Erinnerungen (created_by = user.id).
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

  // Erinnerung laden und Besitz prüfen
  const { data: existing, error: fetchError } = await supabase
    .from("kiosk_reminders")
    .select("id, created_by")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return errorResponse("Erinnerung nicht gefunden", 404);
  }

  if (existing.created_by !== user.id) {
    return errorResponse("Nur eigene Erinnerungen können gelöscht werden", 403);
  }

  const { error: deleteError } = await supabase
    .from("kiosk_reminders")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return errorResponse("Erinnerung konnte nicht gelöscht werden", 500);
  }

  careLog("kiosk-reminders", "delete", {
    userId: user.id,
    reminderId: id,
  });

  return successResponse({ deleted: true });
}
