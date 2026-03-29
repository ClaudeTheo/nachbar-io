// app/api/care/sos/[id]/escalate/route.ts
// Nachbar.io — Manueller Eskalations-Endpunkt: SOS-Alert auf nächste Stufe heben (Thin Route)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { escalateSos } from "@/modules/care/services/sos.service";

// POST /api/care/sos/[id]/escalate — SOS-Alert manuell eskalieren
export async function POST(
  _request: NextRequest,
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

  try {
    const result = await escalateSos(supabase, user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
