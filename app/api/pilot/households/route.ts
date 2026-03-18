// Pilot-Haushaltsliste API — liefert Invite-Codes fuer Druckansicht
// Geschuetzt durch einfaches Token (kein Auth noetig)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PILOT_TOKEN = process.env.PILOT_ADMIN_TOKEN || "pilot-2026";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (token !== PILOT_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("households")
    .select(`
      id, street_name, house_number, invite_code,
      quarter:quarters!inner(name, slug, invite_prefix)
    `)
    .eq("quarters.invite_prefix", "PILOT")
    .order("street_name")
    .order("house_number");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ households: data });
}
