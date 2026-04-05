// POST /api/points/award — Punkte vergeben (fuer Client-seitige Aktionen)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardPoints, POINTS_CONFIG, checkAndAwardBadges } from "@/modules/gamification";

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

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Format" },
      { status: 400 },
    );
  }

  const { action } = body;
  if (!action || !POINTS_CONFIG[action]) {
    return NextResponse.json(
      { error: "Unbekannte Aktion" },
      { status: 400 },
    );
  }

  const result = await awardPoints(supabase, user.id, action);

  // Badge-Check nach Punkte-Vergabe
  const newBadges = await checkAndAwardBadges(supabase, user.id);

  return NextResponse.json({ ...result, newBadges });
}
