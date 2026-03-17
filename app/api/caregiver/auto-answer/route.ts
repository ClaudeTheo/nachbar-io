// GET/PATCH /api/caregiver/auto-answer — Auto-Answer-Einstellungen fuer Kiosk-Videoanruf
// Angehoerige koennen konfigurieren ob/wann ihr Anruf automatisch angenommen wird

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, errorResponse } from "@/lib/care/api-helpers";

// GET: Auto-Answer-Einstellungen fuer einen Caregiver-Link abrufen
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse("Nicht angemeldet", 401);
  const { supabase, user } = authResult;

  const linkId = request.nextUrl.searchParams.get("linkId");
  if (!linkId) return errorResponse("linkId fehlt", 400);

  const { data, error } = await supabase
    .from("caregiver_links")
    .select("auto_answer_allowed, auto_answer_start, auto_answer_end")
    .eq("id", linkId)
    .eq("caregiver_id", user.id)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    return errorResponse("Link nicht gefunden", 404);
  }

  return NextResponse.json(data);
}

// PATCH: Auto-Answer-Einstellungen aktualisieren
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult) return errorResponse("Nicht angemeldet", 401);
  const { supabase, user } = authResult;

  let body: { linkId?: string; autoAnswerAllowed?: boolean; autoAnswerStart?: string; autoAnswerEnd?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiges Anfrage-Format", 400);
  }

  const { linkId, autoAnswerAllowed, autoAnswerStart, autoAnswerEnd } = body;
  if (!linkId) return errorResponse("linkId fehlt", 400);

  const { error } = await supabase
    .from("caregiver_links")
    .update({
      auto_answer_allowed: autoAnswerAllowed,
      auto_answer_start: autoAnswerStart,
      auto_answer_end: autoAnswerEnd,
    })
    .eq("id", linkId)
    .eq("caregiver_id", user.id)
    .is("revoked_at", null);

  if (error) {
    return errorResponse("Update fehlgeschlagen", 500);
  }

  return NextResponse.json({ ok: true });
}
