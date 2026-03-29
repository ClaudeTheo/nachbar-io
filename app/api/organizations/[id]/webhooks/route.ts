// app/api/organizations/[id]/webhooks/route.ts
// Nachbar.io — Webhook-Verwaltung für Pro Community Organisationen

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
  listWebhooks,
  createWebhook,
  deleteWebhook,
} from "@/modules/admin/services/org-webhooks.service";

export const dynamic = "force-dynamic";

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/organizations/[id]/webhooks
 * Listet alle konfigurierten Webhooks der Organisation auf.
 * Secret wird maskiert (nur letzte 4 Zeichen).
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

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, "admin");
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  try {
    const webhooks = await listWebhooks(getServiceDb(), id);
    return NextResponse.json(webhooks);
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * POST /api/organizations/[id]/webhooks
 * Registriert einen neuen Webhook.
 * Body: { url: string, events?: string[] }
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
    const webhook = await createWebhook(getServiceDb(), id, auth.user.id, body);
    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

/**
 * DELETE /api/organizations/[id]/webhooks
 * Entfernt einen Webhook.
 * Body: { webhook_id: string }
 */
export async function DELETE(
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

  const webhookId = body.webhook_id as string | undefined;
  if (!webhookId) {
    return NextResponse.json(
      { error: "webhook_id ist erforderlich" },
      { status: 400 },
    );
  }

  try {
    await deleteWebhook(getServiceDb(), id, auth.user.id, webhookId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleServiceError(error);
  }
}
