// Pilot-Haushaltsliste API — liefert Invite-Codes für Druckansicht
// Geschützt durch einfaches Token (kein Auth nötig)
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPilotHouseholds } from "@/lib/services/pilot.service";
import { handleServiceError } from "@/lib/services/service-error";

const PILOT_TOKEN = process.env.PILOT_ADMIN_TOKEN || "pilot-2026";

export async function GET(req: NextRequest) {
  try {
    // Token-Check bleibt in der Route (analog zu Cron-Pattern)
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (token !== PILOT_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminSupabase();
    const households = await getPilotHouseholds(adminDb);

    return NextResponse.json({ households });
  } catch (error) {
    return handleServiceError(error);
  }
}
