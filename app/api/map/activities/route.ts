import { NextRequest, NextResponse } from "next/server";

import {
  loadMapActivityFeed,
  resolveMapActivityMode,
} from "@/lib/map-activity-feed";
import { getUserHouseholdId, getUserQuarterId } from "@/lib/quarters/helpers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface UserProfileModeRow {
  ui_mode: string | null;
  role: string | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  try {
    const { data: profile } = await supabase
      .from("users")
      .select("ui_mode, role")
      .eq("id", user.id)
      .maybeSingle<UserProfileModeRow>();
    const requestedMode = request.nextUrl.searchParams.get("mode");
    const mode = resolveMapActivityMode(requestedMode, profile?.ui_mode);
    const requestedQuarterId = request.nextUrl.searchParams.get("quarter_id");
    const quarterId =
      requestedQuarterId ?? (await getUserQuarterId(supabase, user.id));
    const householdId = await getUserHouseholdId(supabase, user.id);

    const pins = await loadMapActivityFeed({
      supabase,
      quarterId,
      context: {
        mode,
        role: profile?.role ?? "resident",
        userId: user.id,
        householdId,
      },
    });

    return NextResponse.json(pins);
  } catch (error) {
    console.error("[map-activities] Feed konnte nicht geladen werden:", error);
    return NextResponse.json(
      { error: "Kartenaktivitaeten konnten nicht geladen werden" },
      { status: 500 },
    );
  }
}
