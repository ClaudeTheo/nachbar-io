// POST /api/badges/check — Badge-Bedingungen pruefen und neue vergeben
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndAwardBadges } from "@/modules/gamification";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );

  const newBadges = await checkAndAwardBadges(supabase, user.id);
  return NextResponse.json({ newBadges });
}
