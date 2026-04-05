// GET /api/prevention/insurance-configs
// Gibt alle aktiven Krankenkassen-Konfigurationen zurueck
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json([], { status: 401 });
    }

    const { data, error } = await supabase
      .from("insurance_configs")
      .select(
        "id, name, short_name, submission_type, submission_url, instructions",
      )
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Insurance configs laden fehlgeschlagen:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Insurance configs Fehler:", err);
    return NextResponse.json([]);
  }
}
