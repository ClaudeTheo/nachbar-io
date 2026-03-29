// app/api/doctors/route.ts
// Nachbar.io — Öffentliche Arzt-Liste (Thin Wrapper)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { listDoctors } from "@/lib/services/doctors.service";

// GET /api/doctors — Öffentliche Liste sichtbarer Ärzte
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const data = await listDoctors(supabase, {
      quarterId: searchParams.get("quarter_id"),
      specialization: searchParams.get("specialization"),
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}
