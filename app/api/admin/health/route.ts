import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runHealthChecks } from "@/modules/admin/services/health.service";

/**
 * GET /api/admin/health
 *
 * System-Health-Checks fuer das Admin-Dashboard.
 * Nur fuer Admins zugaenglich.
 */
export async function GET() {
  const supabase = await createClient();

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

  const result = await runHealthChecks(supabase);
  return NextResponse.json(result);
}
