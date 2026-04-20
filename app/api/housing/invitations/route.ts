import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createHousingInvitation,
  type InvitationChannel,
} from "@/lib/housing/invitations";

// POST /api/housing/invitations
// Bewohner erzeugt Einladung fuer seine Hausverwaltung.
// Body: { expectedOrgName: string, expectedEmail?: string, channel: 'mailto'|'share'|'pdf' }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let body: {
    expectedOrgName?: string;
    expectedEmail?: string;
    channel?: InvitationChannel;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungueltiges Anfrage-Format" },
      { status: 400 },
    );
  }

  if (!body.expectedOrgName || body.expectedOrgName.trim().length === 0) {
    return NextResponse.json(
      { error: "expectedOrgName erforderlich" },
      { status: 400 },
    );
  }
  if (!body.channel) {
    return NextResponse.json(
      { error: "channel erforderlich" },
      { status: 400 },
    );
  }

  // Primaerhaushalt des Users
  const { data: membership, error: mErr } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (mErr) {
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }
  if (!membership?.household_id) {
    return NextResponse.json(
      { error: "Kein Haushalt fuer diesen Nutzer gefunden" },
      { status: 400 },
    );
  }

  try {
    const invitation = await createHousingInvitation(supabase, {
      householdId: membership.household_id,
      invitedByUserId: user.id,
      expectedOrgName: body.expectedOrgName,
      expectedEmail: body.expectedEmail,
      channel: body.channel,
    });

    const origin = new URL(request.url).origin;
    const magicLinkUrl = `${origin}/einladung/${invitation.token}`;

    return NextResponse.json({
      token: invitation.token,
      code: invitation.code,
      expiresAt: invitation.expiresAt,
      magicLinkUrl,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
