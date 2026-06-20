// app/api/circle-events/route.ts
// Task H-6: Termin im Familienkreis erstellen (aus SCHREIBEN-Flow)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { createCircleEvent } from "@/lib/services/circle-events.service";

export const dynamic = "force-dynamic";

interface CreateEventBody {
  scheduledAt: string;
  title: string;
  whoComes: string;
  description?: string;
  // Welle F3 (C2:5): Angehoeriger legt einen Termin fuer den Bewohner an.
  // Ohne residentId bleibt es beim Selbst-Anlegen (Bewohner/Voice-Flow).
  residentId?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  let body: CreateEventBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request.", 400);
  }

  if (!body.title?.trim()) {
    return errorResponse("Titel fehlt.", 400);
  }

  if (!body.scheduledAt) {
    return errorResponse("Datum fehlt.", 400);
  }

  const residentId = body.residentId?.trim() || auth.user.id;

  // Caregiver-Pfad: Defense-in-Depth zur RLS (circle_events_insert_caregiver) —
  // bei fremdem residentId muss ein aktiver caregiver_link bestehen, sonst 403
  // mit klarer Meldung statt einem RLS-bedingten 500.
  if (residentId !== auth.user.id) {
    const { data: link } = await auth.supabase
      .from("caregiver_links")
      .select("id")
      .eq("caregiver_id", auth.user.id)
      .eq("resident_id", residentId)
      .is("revoked_at", null)
      .maybeSingle();
    if (!link) {
      return errorResponse("Keine aktive Verknuepfung mit dieser Person.", 403);
    }
  }

  try {
    const event = await createCircleEvent(auth.supabase, auth.user.id, {
      residentId,
      scheduledAt: body.scheduledAt,
      title: body.title,
      whoComes: body.whoComes ?? "",
      description: body.description,
    });
    return NextResponse.json(event);
  } catch {
    return errorResponse("Termin konnte nicht erstellt werden.", 500);
  }
}
