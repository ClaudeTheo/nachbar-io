// app/api/care/checkin/route.ts
// Nachbar.io — Check-in abgeben (POST) und Check-in-Historie abrufen (GET)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  submitCheckin,
  getCheckinHistory,
} from "@/modules/care/services/checkin.service";

// POST /api/care/checkin — Check-in abgeben
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
    const result = await submitCheckin(supabase, user.id, body);
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

// GET /api/care/checkin — Check-in-Historie abrufen
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
    const seniorId = searchParams.get("senior_id") ?? user.id;
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 30, 1), 100)
      : 30;
    const result = await getCheckinHistory(supabase, user.id, seniorId, limit);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
