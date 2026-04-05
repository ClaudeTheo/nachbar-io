// GET /api/points/log — Punkte-Historie (paginiert)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPointsLog } from "@/modules/gamification";

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

  const { searchParams } = request.nextUrl;
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "20", 10) || 20,
    100,
  );
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  const log = await getPointsLog(supabase, user.id, limit, offset);
  return NextResponse.json(log);
}
