import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDbOverview } from "@/modules/admin/services/db-overview.service";

/**
 * GET /api/admin/db-overview
 *
 * Gibt Tabellen-Uebersicht zurueck: Name, Zeilen-Count, Kategorie.
 * Verwendet Service-Role um RLS zu umgehen.
 * Nur fuer Admins.
 */
export async function GET() {
  const supabase = await createServerClient();

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Nur Admins" }, { status: 403 });
  }

  const adminDb = getAdminSupabase();
  const result = await getDbOverview(adminDb);
  return NextResponse.json(result);
}
