// GET /api/prevention/caregiver/status
// Praevention-Status fuer Angehoerige (nur wenn Sichtbarkeit gewaehrt)
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCaregiverPreventionStatus } from "@/modules/praevention/services/visibility.service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json([], { status: 401 });
    }

    const statuses = await getCaregiverPreventionStatus(user.id);
    return NextResponse.json(statuses);
  } catch (err) {
    console.error("Caregiver prevention status error:", err);
    return NextResponse.json([]);
  }
}
