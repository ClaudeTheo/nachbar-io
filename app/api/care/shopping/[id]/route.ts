// app/api/care/shopping/[id]/route.ts
// Nachbar.io — Einkaufshilfe: Status-Übergänge (PATCH), Löschen (DELETE)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  updateShoppingStatus,
  deleteShoppingRequest,
} from "@/modules/care/services/shopping.service";

export const dynamic = "force-dynamic";

// PATCH /api/care/shopping/[id] — Status-Änderung oder Items aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: {
    action?: string;
    items?: { name: string; quantity?: string; checked?: boolean }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateShoppingStatus(auth.supabase, {
      requestId: id,
      userId: auth.user.id,
      action: body.action,
      items: body.items,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/shopping/[id]");
  }
}

// DELETE /api/care/shopping/[id] — Offene Anfrage löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const result = await deleteShoppingRequest(auth.supabase, {
      requestId: id,
      userId: auth.user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, request, "/api/care/shopping/[id]");
  }
}
