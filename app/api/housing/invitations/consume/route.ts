import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { consumeHousingInvitation } from "@/lib/housing/invitations";

// POST /api/housing/invitations/consume
// Hausverwalter loest Token oder 6-stelligen Code ein.
// Body: { token: string }  (Token ODER Code im selben Feld)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  const tokenOrCode = body.token?.trim();
  if (!tokenOrCode) {
    return NextResponse.json({ error: "token erforderlich" }, { status: 400 });
  }

  try {
    const admin = getAdminSupabase();
    const result = await consumeHousingInvitation(admin, tokenOrCode, user.id);
    return NextResponse.json({
      civicOrgId: result.civicOrgId,
      householdId: result.householdId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    const isNotFound = /nicht gefunden|abgelaufen|not[-_ ]?found/i.test(msg);
    return NextResponse.json(
      { error: msg },
      { status: isNotFound ? 404 : 400 },
    );
  }
}
