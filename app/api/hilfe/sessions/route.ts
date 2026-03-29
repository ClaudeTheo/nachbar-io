// app/api/hilfe/sessions/route.ts
// Nachbar Hilfe — Einsatz-Dokumentation: Sessions auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listSessions,
  createSession,
} from "@/modules/hilfe/services/hilfe-sessions.service";

// GET /api/hilfe/sessions — Eigene Hilfe-Sessions auflisten (als Helfer oder Bewohner)
export async function GET() {
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
    const data = await listSessions(supabase);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/hilfe/sessions — Neue Session erstellen
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
    const session = await createSession(supabase, body);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
