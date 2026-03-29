// app/api/care/tasks/[id]/route.ts
// Nachbar.io — Aufgabentafel: Status-Übergänge (PATCH) und Löschen (DELETE)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  updateTaskStatus,
  deleteTask,
} from "@/modules/care/services/tasks.service";

export const dynamic = "force-dynamic";

// PATCH /api/care/tasks/[id] — Status-Übergang
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateTaskStatus(auth.supabase, {
      taskId: id,
      userId: auth.user.id,
      action: body.action,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleServiceError(error);
  }
}

// DELETE /api/care/tasks/[id] — Aufgabe löschen (nur Ersteller, nur offene)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const result = await deleteTask(auth.supabase, {
      taskId: id,
      userId: auth.user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
