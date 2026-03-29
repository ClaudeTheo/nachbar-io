import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listQuarterAdmins,
  assignQuarterAdmin,
  removeQuarterAdmin,
} from "@/modules/admin/services/quarter-admins.service";

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
 * GET /api/admin/quarters/[id]/admins
 * Liste aller Admins für ein Quartier.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  try {
    const result = await listQuarterAdmins(getAdminDb(), id);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}

/**
 * POST /api/admin/quarters/[id]/admins
 * Benutzer als Quartier-Admin zuweisen. Body: { user_id: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id ist erforderlich" }, { status: 400 });
  }

  try {
    const created = await assignQuarterAdmin(getAdminDb(), id, user_id, auth.user!.id);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}

/**
 * DELETE /api/admin/quarters/[id]/admins
 * Quartier-Admin entfernen. Body: { user_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id ist erforderlich" }, { status: 400 });
  }

  try {
    await removeQuarterAdmin(getAdminDb(), id, user_id);
    return NextResponse.json({ message: "Quartier-Admin entfernt" });
  } catch (err) {
    return handleServiceError(err);
  }
}
