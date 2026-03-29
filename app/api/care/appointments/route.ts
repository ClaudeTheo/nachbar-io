// app/api/care/appointments/route.ts
// Nachbar.io — Termine auflisten (GET) und anlegen (POST)

import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listAppointments,
  createAppointment,
} from "@/modules/care/services/appointments.service";

// GET /api/care/appointments — Termine abrufen
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  try {
    const { searchParams } = request.nextUrl;
    const data = await listAppointments(auth.supabase, {
      userId: auth.user.id,
      seniorId: searchParams.get("senior_id") ?? undefined,
      upcoming: searchParams.get("upcoming") !== "false",
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/care/appointments — Neuen Termin anlegen
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const sub = await requireSubscription(auth.supabase, auth.user.id, "plus");
  if (sub instanceof NextResponse) return sub;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const data = await createAppointment(auth.supabase, {
      userId: auth.user.id,
      ...body,
    } as Parameters<typeof createAppointment>[1]);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
