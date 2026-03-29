// app/api/appointments/route.ts
// Nachbar.io — Termin-Buchungen auflisten + anlegen (Thin Wrapper)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listAppointments,
  createAppointment,
} from "@/lib/services/appointments.service";

// GET /api/appointments — Termine auflisten
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = request.nextUrl;
    const data = await listAppointments(supabase, user.id, {
      status: searchParams.get("status"),
      upcoming: searchParams.get("upcoming") !== "false",
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/appointments — Neuen Termin buchen
export async function POST(request: NextRequest) {
  try {
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
    const appointment = await createAppointment(supabase, user.id, body);
    return NextResponse.json(appointment, { status: 201 });
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
