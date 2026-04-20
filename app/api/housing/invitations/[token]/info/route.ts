import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

const PUBLIC_INVITATION_NOT_FOUND = { error: "invitation_not_found" } as const;

function notFoundResponse() {
  return NextResponse.json(PUBLIC_INVITATION_NOT_FOUND, { status: 404 });
}

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

  try {
    const { data, error } = await admin
      .from("housing_invitations")
      .select("expected_org_name, expires_at")
      .or(`invite_token.eq.${needle},invite_code.eq.${needle}`)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") {
        return notFoundResponse();
      }

      console.error("[housing] invitation info lookup failed", {
        code: error.code,
        message: error.message,
      });
      return notFoundResponse();
    }
    if (!data) {
      return notFoundResponse();
    }

    return NextResponse.json({
      expectedOrgName: data.expected_org_name,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error("[housing] invitation info lookup threw", error);
    return notFoundResponse();
  }
}
