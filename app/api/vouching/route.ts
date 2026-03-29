// POST /api/vouching — Nachbar-Vouching: 2 Nachbarn bestätigen Identität
// GET /api/vouching — Unverifizierte Nachbarn im eigenen Quartier laden
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  vouchForUser,
  listUnverifiedNeighbors,
} from "@/lib/services/vouching.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const { target_user_id } = await request.json();

  try {
    const result = await vouchForUser(supabase, user.id, target_user_id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    const result = await listUnverifiedNeighbors(supabase, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
