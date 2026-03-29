import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/services/service-error";
import { listQuartersWithStats, createQuarter } from "@/modules/admin/services/quarters.service";

// Auth + Rollen-Check
async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Nur Super-Admins" }, { status: 403 }) };
  }
  return { user };
}

function getAdminDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/admin/quarters
 * Liste aller Quartiere mit Statistiken. Nur für super_admin.
 */
export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const result = await listQuartersWithStats(getAdminDb());
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}

/**
 * POST /api/admin/quarters
 * Neues Quartier erstellen. Nur für super_admin.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const body = await request.json();
    const created = await createQuarter(getAdminDb(), auth.user!.id, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
