// GET /api/badges — Eigene Abzeichen (verdient + nicht verdient)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBadges } from "@/modules/gamification";

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

  const badges = await getUserBadges(supabase, user.id);
  return NextResponse.json(badges);
}
