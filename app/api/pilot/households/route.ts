// Pilot-Haushaltsliste API — liefert Invite-Codes für Druckansicht
// Geschützt durch einfaches Token (kein Auth nötig)
import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPilotHouseholds } from "@/lib/services/pilot.service";
import { handleServiceError } from "@/lib/services/service-error";

export async function GET(req: NextRequest) {
  try {
    // Token-Check: PILOT_ADMIN_TOKEN muss gesetzt sein (kein Fallback!)
    const pilotToken = process.env.PILOT_ADMIN_TOKEN;
    if (!pilotToken) {
      console.error("[pilot/households] PILOT_ADMIN_TOKEN nicht konfiguriert — Endpoint gesperrt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (token !== pilotToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminSupabase();
    const households = await getPilotHouseholds(adminDb);

    return NextResponse.json({ households });
  } catch (error) {
    return handleServiceError(error);
  }
}
