// app/api/care/contact/chat/route.ts
// Nachbar.io — Resident-seitige Chat-Konversation mit Caregiver erstellen/finden
// Gegenstueck zu /api/caregiver/chat (das vom Caregiver aus funktioniert)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import { ServiceError } from "@/lib/services/service-error";

// POST /api/care/contact/chat — Konversation mit verknuepftem Caregiver erstellen/finden
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  let body: { caregiver_id?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungültiges Anfrage-Format", 400);
  }

  const caregiverId = body.caregiver_id;
  if (!caregiverId) {
    return errorResponse("caregiver_id erforderlich", 400);
  }

  try {
    const userId = auth.user.id;
    const supabase = auth.supabase;

    // Aktive Verknuepfung pruefen (Bewohner → Caregiver)
    const { data: link, error: linkError } = await supabase
      .from("caregiver_links")
      .select("id")
      .eq("resident_id", userId)
      .eq("caregiver_id", caregiverId)
      .is("revoked_at", null)
      .single();

    if (linkError || !link) {
      throw new ServiceError(
        "Keine aktive Verknüpfung mit diesem Angehörigen",
        403,
      );
    }

    // Bestehende Konversation suchen
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${userId},participant_2.eq.${caregiverId}),` +
          `and(participant_1.eq.${caregiverId},participant_2.eq.${userId})`,
      )
      .single();

    if (existing) {
      return NextResponse.json({
        conversation_id: existing.id,
        created: false,
      });
    }

    // Neue Konversation erstellen (participant_1 < participant_2 wegen CHECK constraint)
    const [p1, p2] =
      userId < caregiverId ? [userId, caregiverId] : [caregiverId, userId];

    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({ participant_1: p1, participant_2: p2 })
      .select("id")
      .single();

    if (convError) {
      console.error(
        "[care/contact/chat] Konversation erstellen:",
        convError.message,
      );
      throw new ServiceError("Konversation konnte nicht erstellt werden", 500);
    }

    return NextResponse.json({ conversation_id: newConv.id, created: true });
  } catch (error) {
    return handleServiceError(error);
  }
}
