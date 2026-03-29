// app/api/hilfe/helpers/route.ts
// Nachbar Hilfe — Nachbarschaftshelfer auflisten (GET) und registrieren (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listHelpers,
  registerHelper,
} from "@/modules/hilfe/services/hilfe-core.service";

// GET /api/hilfe/helpers — Verifizierte Helfer auflisten
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

  const { searchParams } = request.nextUrl;
  const quarterId = searchParams.get("quarter_id");

  try {
    const data = await listHelpers(supabase, { quarterId });
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/hilfe/helpers — Als Nachbarschaftshelfer registrieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const helper = await registerHelper(supabase, user.id, body);
    return NextResponse.json(helper, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
