// app/api/care/sos/route.ts
// Nachbar.io — SOS-Auslöse- und Listendpunkt für das Care-Modul (Thin Route)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ServiceError, handleServiceError } from "@/lib/services/service-error";
import { triggerSos, listSosAlerts } from "@/modules/care/services/sos.service";
import type { CareSosCategory, CareSosSource } from "@/lib/care/types";

// POST /api/care/sos — SOS auslösen
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

  let body: {
    category?: CareSosCategory;
    notes?: string;
    source?: CareSosSource;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const result = await triggerSos(supabase, { userId: user.id, ...body });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // Feature-Gate: requiredFeature im Response mitgeben (fuer Client-Upgrade-Hinweis)
    if (error instanceof ServiceError && error.code) {
      return NextResponse.json(
        { error: error.message, requiredFeature: error.code },
        { status: error.status },
      );
    }
    return handleServiceError(error);
  }
}

// GET /api/care/sos — Aktive SOS-Alerts abrufen
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
  try {
    const result = await listSosAlerts(supabase, {
      userId: user.id,
      statusFilter: searchParams.get("status") ?? undefined,
      seniorId: searchParams.get("senior_id") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
