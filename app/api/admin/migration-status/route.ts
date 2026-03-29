import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkMigrationStatus } from "@/modules/admin/services/migration-status.service";

/**
 * GET /api/admin/migration-status
 *
 * Prueft ob Migration 037 (Notification Types) angewendet wurde.
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

  const adminSupabase = getAdminSupabase();
  const result = await checkMigrationStatus(adminSupabase, user.id);
  return NextResponse.json(result);
}
