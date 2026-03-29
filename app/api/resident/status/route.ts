// app/api/resident/status/route.ts
// Nachbar.io — Bewohner-Status: ok/warning/missing/critical basierend auf Heartbeat

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResidentStatus } from "@/lib/services/misc-utilities.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const residentId = request.nextUrl.searchParams.get("resident_id");

  try {
    const result = await getResidentStatus(supabase, user.id, residentId!);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
