// app/api/doctors/[id]/reviews/route.ts
// Nachbar.io — Arzt-Bewertungen lesen + erstellen (Thin Wrapper)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listDoctorReviews,
  createDoctorReview,
} from "@/lib/services/doctors.service";

// GET /api/doctors/[id]/reviews — Öffentliche Bewertungen eines Arztes
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: doctorId } = await params;
    const supabase = await createClient();
    const data = await listDoctorReviews(supabase, doctorId);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/doctors/[id]/reviews — Bewertung abgeben (authentifiziert)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: doctorId } = await params;
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
    const review = await createDoctorReview(supabase, user.id, doctorId, body);
    return NextResponse.json(review, { status: 201 });
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
