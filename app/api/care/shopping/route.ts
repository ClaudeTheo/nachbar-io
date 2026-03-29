// app/api/care/shopping/route.ts
// Nachbar.io — Einkaufshilfe: Liste abrufen (GET) und Anfrage erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listShoppingRequests,
  createShoppingRequest,
} from "@/modules/care/services/shopping.service";

export const dynamic = "force-dynamic";

// GET /api/care/shopping — Einkaufsanfragen auflisten
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const { searchParams } = request.nextUrl;
    const data = await listShoppingRequests(auth.supabase, {
      status: searchParams.get("status") ?? "open",
      quarterId: searchParams.get("quarter_id") ?? undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/care/shopping — Neue Einkaufsanfrage erstellen
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: {
    items?: { name?: string; quantity?: string }[];
    note?: string;
    due_date?: string;
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
    const shopping = await createShoppingRequest(auth.supabase, {
      userId: auth.user.id,
      items: body.items,
      note: body.note,
      due_date: body.due_date,
    });
    return NextResponse.json(shopping, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
