// app/api/doctors/[id]/route.ts
// Nachbar.io — Einzelnes Arzt-Profil lesen + aktualisieren (Thin Wrapper)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getDoctorProfile,
  updateDoctorProfile,
} from "@/lib/services/doctors.service";

// GET /api/doctors/[id] — Öffentliches Arzt-Profil abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const data = await getDoctorProfile(supabase, id);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error, request, "/api/doctors/[id]");
  }
}

// PATCH /api/doctors/[id] — Eigenes Arzt-Profil aktualisieren
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
    const profile = await updateDoctorProfile(supabase, user.id, id, body);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Ungültiges Anfrage-Format" },
        { status: 400 },
      );
    }
    return handleServiceError(error, request, "/api/doctors/[id]");
  }
}
