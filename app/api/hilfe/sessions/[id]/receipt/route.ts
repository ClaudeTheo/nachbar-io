// app/api/hilfe/sessions/[id]/receipt/route.ts
// Nachbar Hilfe — PDF-Quittung generieren (POST) und abrufen (GET)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  generateSessionReceipt,
  getReceipt,
} from "@/modules/hilfe/services/hilfe-sessions.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/hilfe/sessions/[id]/receipt — PDF generieren und speichern
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
    const result = await generateSessionReceipt(supabase, sessionId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

// GET /api/hilfe/sessions/[id]/receipt — Quittungsinformationen abrufen
export async function GET(_request: NextRequest, context: RouteContext) {
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

  try {
    const receipt = await getReceipt(supabase, sessionId);
    return NextResponse.json(receipt);
  } catch (error) {
    return handleServiceError(error);
  }
}
