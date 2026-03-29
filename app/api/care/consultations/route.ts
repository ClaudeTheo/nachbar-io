// app/api/care/consultations/route.ts
// Nachbar.io — Online-Sprechstunde: Slots auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listConsultationSlots,
  createConsultationSlot,
} from "@/modules/care/services/consultations.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const data = await listConsultationSlots(auth.supabase, {
      userId: auth.user.id,
      quarterId: request.nextUrl.searchParams.get("quarter_id"),
      myOnly: request.nextUrl.searchParams.get("my") === "true",
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  try {
    const data = await createConsultationSlot(
      auth.supabase,
      auth.user.id,
      body,
    );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
