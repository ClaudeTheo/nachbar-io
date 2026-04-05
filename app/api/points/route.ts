// GET /api/points — Eigene Punkte + Level + Fortschritt
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPointsInfo } from "@/modules/gamification";

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

  const info = await getPointsInfo(supabase, user.id);
  return NextResponse.json(info);
}
