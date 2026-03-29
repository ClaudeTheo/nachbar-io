import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/services/service-error";
import {
  getQuarterDetail,
  updateQuarter,
  archiveQuarter,
} from "@/modules/admin/services/quarter-detail.service";

// Hilfsfunktion: Super-Admin Auth prüfen
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

// Service-Client für cross-quarter Zugriff
function getAdminDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/admin/quarters/[id]
 * Einzelnes Quartier mit vollständigen Stats laden.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  try {
    const result = await getQuarterDetail(getAdminDb(), id);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}

/**
 * PUT /api/admin/quarters/[id]
 * Quartier-Felder aktualisieren.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  try {
    const body = await request.json();
    const updated = await updateQuarter(getAdminDb(), id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return handleServiceError(err);
  }
}

/**
 * DELETE /api/admin/quarters/[id]
 * Soft-Delete: Status auf 'archived' setzen (KEIN Hard-Delete).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  try {
    const updated = await archiveQuarter(getAdminDb(), id);
    return NextResponse.json({ message: "Quartier archiviert", quarter: updated });
  } catch (err) {
    return handleServiceError(err);
  }
}
