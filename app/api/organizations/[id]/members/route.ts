// app/api/organizations/[id]/members/route.ts
// Nachbar.io — Org-Mitglieder: Auflisten (GET) und Hinzufügen (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  requireAuth,
  requireSubscription,
  requireOrgAccess,
  requireAdmin,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listMembers,
  addMember,
} from "@/modules/admin/services/org-members.service";

export const dynamic = "force-dynamic";

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/organizations/[id]/members
 * Mitglieder der Organisation auflisten.
 * Sichtbar für alle Org-Mitglieder und Plattform-Admins.
 * Erfordert Pro-Abo.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "pro");
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: beliebige Org-Rolle (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id);
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  try {
    const members = await listMembers(getServiceDb(), id);
    return NextResponse.json(members);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/organizations/[id]/members
 * Mitglied zur Organisation hinzufügen.
 * Nur org_admin oder Plattform-Admin. Erfordert Pro-Abo.
 * Body: { user_id, role, assigned_quarters? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "pro");
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, "admin");
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges Anfrage-Format" },
      { status: 400 },
    );
  }

  try {
    const member = await addMember(getServiceDb(), id, auth.user.id, body);
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
