// app/api/care/profile/route.ts
// Nachbar.io — Pflege-Profil lesen (GET) und aktualisieren (PUT)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getCareProfile,
  updateCareProfile,
} from "@/modules/care/services/profile.service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  try {
    const seniorId = request.nextUrl.searchParams.get("senior_id") ?? user.id;
    const result = await getCareProfile(supabase, user.id, seniorId);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

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
    const result = await updateCareProfile(supabase, user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
