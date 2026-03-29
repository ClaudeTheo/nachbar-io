// app/api/organizations/route.ts
// Nachbar.io — Organisationen: Auflisten (GET) und Erstellen (POST)

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  requireAuth,
  requireSubscription,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import { handleServiceError } from "@/lib/services/service-error";
import {
  listOrganizations,
  createOrganization,
} from "@/modules/admin/services/organizations.service";

export const dynamic = "force-dynamic";

// Service-Client für Admin-Operationen (Insert umgeht RLS)
function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/organizations
 * Eigene Organisationen auflisten (via RLS: nur Orgs wo User Mitglied ist).
 * Admins sehen alle Organisationen.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    const data = await listOrganizations(auth.supabase);
    return NextResponse.json(data);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/organizations
 * Neue Organisation erstellen. Nur für Plattform-Admins mit Pro-Abo (is_admin = true).
 * Body: { name, type, hr_vr_number, contact_email, contact_phone?, address? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, "pro");
  if (sub instanceof NextResponse) return sub;

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
    const org = await createOrganization(
      auth.supabase,
      getServiceDb(),
      auth.user.id,
      body,
    );
    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
