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

  try {
    const event = await createCircleEvent(auth.supabase, auth.user.id, {
      residentId: auth.user.id,
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
