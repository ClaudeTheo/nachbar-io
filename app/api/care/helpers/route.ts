// app/api/care/helpers/route.ts
// Nachbar.io — Helfer auflisten (GET) und registrieren (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listHelpers,
  registerHelper,
} from "@/modules/care/services/helpers.service";

// GET /api/care/helpers — Helfer auflisten
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
    const { searchParams } = request.nextUrl;
    const result = await listHelpers(supabase, user.id, {
      seniorId: searchParams.get("senior_id"),
      role: searchParams.get("role"),
      status: searchParams.get("status"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/care/helpers — Als Helfer registrieren
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

  try {
    const body = await request.json().catch(() => {
      throw { status: 400 };
    });
    const result = await registerHelper(supabase, user.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status: number }).status === 400 &&
      !("message" in error)
    ) {
      return NextResponse.json(
        { error: "Ungültiges Anfrage-Format" },
        { status: 400 },
      );
    }
    return handleServiceError(error);
  }
}
