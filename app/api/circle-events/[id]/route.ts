// app/api/circle-events/[id]/route.ts
// Welle F3-Folge (Befund C2:5): Termin als erledigt markieren. Der Ersteller
// (i.d.R. der Angehoerige, der den Termin angekuendigt hat) raeumt einen
// abgelaufenen/abgesagten Termin weg. markAsDone ist ein Soft-Delete (setzt
// deleted_at) und ist im Service auf .eq(created_by) gescoped — zusaetzlich
// greift RLS circle_events_update_creator. Ein fremder Termin ist nicht
// loeschbar (kein IDOR): bei created_by-Mismatch trifft das UPDATE 0 Zeilen.

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import { markAsDone } from "@/lib/services/circle-events.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const { id } = await params;
  if (!id) return errorResponse("Termin-ID fehlt.", 400);

  try {
    await markAsDone(auth.supabase, id, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return errorResponse("Termin konnte nicht als erledigt markiert werden.", 500);
  }
}
