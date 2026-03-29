// app/api/appointments/[id]/route.ts
// Nachbar.io — Einzelnen Termin lesen, aktualisieren, absagen (Thin Wrapper)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getAppointment,
  updateAppointment,
  cancelAppointment,
} from "@/lib/services/appointments.service";

// GET /api/appointments/[id] — Einzelnen Termin abrufen
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    const data = await getAppointment(supabase, user.id, id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// PATCH /api/appointments/[id] — Status aktualisieren, Notizen ändern
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const appointment = await updateAppointment(supabase, user.id, id, body);
    return NextResponse.json(appointment);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Ungültiges Anfrage-Format" },
        { status: 400 },
      );
    }
    return handleServiceError(error);
  }
}

// DELETE /api/appointments/[id] — Termin absagen (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 },
      );
    }

    const data = await cancelAppointment(supabase, user.id, id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
