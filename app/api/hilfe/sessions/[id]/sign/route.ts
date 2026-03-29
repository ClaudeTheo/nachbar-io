// app/api/hilfe/sessions/[id]/sign/route.ts
// Nachbar Hilfe — Unterschrift hochladen (Helfer oder Bewohner)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import { uploadSignature } from "@/modules/hilfe/services/hilfe-sessions.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/hilfe/sessions/[id]/sign — Unterschrift speichern
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  const { id: sessionId } = await context.params;

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
    const updated = await uploadSignature(supabase, sessionId, body);
    return NextResponse.json(updated);
  } catch (error) {
    return handleServiceError(error);
  }
}
