import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// GET /api/housing/invitations/[token]/info
// Public-Endpoint fuer HV-Landing-Page. Gibt nur minimale, DSGVO-freundliche
// Infos zurueck: erwarteten HV-Namen + Ablauf. KEINE Bewohner-Adresse.
export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.trim().length === 0) {
    return NextResponse.json({ error: "token fehlt" }, { status: 400 });
  }

  const needle = token.trim();
  const admin = getAdminSupabase();

  const { data, error } = await admin
    .from("housing_invitations")
    .select("expected_org_name, expires_at")
    .or(`invite_token.eq.${needle},invite_code.eq.${needle}`)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Einladung nicht gefunden oder abgelaufen" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    expectedOrgName: data.expected_org_name,
    expiresAt: data.expires_at,
  });
}
