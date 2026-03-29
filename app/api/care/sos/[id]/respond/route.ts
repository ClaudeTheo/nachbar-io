// app/api/care/sos/[id]/respond/route.ts
// Nachbar.io — SOS-Reaktions-Endpunkt: Helfer reagiert auf einen aktiven Alert (Thin Route)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { respondToSos } from "@/modules/care/services/sos.service";
import type { CareSosResponseType } from "@/lib/care/types";

// POST /api/care/sos/[id]/respond — Als Helfer auf einen SOS-Alert reagieren
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    response_type?: CareSosResponseType;
    eta_minutes?: number;
    note?: string;
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
    const result = await respondToSos(supabase, user.id, id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
