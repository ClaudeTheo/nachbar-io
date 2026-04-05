import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listGroups,
  createGroup,
} from "@/modules/gruppen/services/gruppen.service";

// GET /api/groups — Alle Gruppen im eigenen Quartier
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
    const mine = request.nextUrl.searchParams.get("mine") === "true";
    const data = await listGroups(supabase, user.id, mine);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

// POST /api/groups — Neue Gruppe erstellen
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const group = await createGroup(
      supabase,
      user.id,
      body as unknown as Parameters<typeof createGroup>[2],
    );
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
