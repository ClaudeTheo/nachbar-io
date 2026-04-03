// app/api/hilfe/requests/route.ts
// Nachbar Hilfe — Hilfe-Gesuche auflisten (GET) und erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listRequests,
  createRequest,
} from "@/modules/hilfe/services/hilfe-requests.service";

// GET /api/hilfe/requests — Offene Hilfe-Gesuche auflisten
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
    const quarterId = request.nextUrl.searchParams.get("quarter_id");
    const data = await listRequests(supabase, user.id, quarterId);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/hilfe/requests — Neues Hilfe-Gesuch erstellen
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
    quarter_id?: string;
    category?: string;
    title?: string;
    description?: string | null;
    type?: "need" | "offer";
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
    const helpRequest = await createRequest(supabase, user.id, body);
    return NextResponse.json(helpRequest, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
