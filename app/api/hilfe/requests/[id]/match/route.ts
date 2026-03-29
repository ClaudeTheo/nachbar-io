// app/api/hilfe/requests/[id]/match/route.ts
// Nachbar Hilfe — Helfer-Matching: Bewerben (POST) und Bestaetigen (PUT)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  applyForRequest,
  confirmMatch,
} from "@/modules/hilfe/services/hilfe-requests.service";

// POST /api/hilfe/requests/[id]/match — Helfer bewirbt sich auf ein Gesuch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  const { id: requestId } = await params;

  let body: { helper_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const match = await applyForRequest(
      supabase,
      user.id,
      requestId,
      body.helper_id ?? "",
    );
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

// PUT /api/hilfe/requests/[id]/match — Bewohner bestaetigt einen Match
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  const { id: requestId } = await params;

  let body: { match_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const updatedMatch = await confirmMatch(
      supabase,
      user.id,
      requestId,
      body.match_id ?? "",
    );
    return NextResponse.json(updatedMatch, { status: 200 });
  } catch (error) {
    return handleServiceError(error);
  }
}
