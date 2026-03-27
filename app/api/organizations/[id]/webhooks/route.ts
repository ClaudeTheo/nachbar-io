// app/api/organizations/[id]/webhooks/route.ts
// Nachbar.io — Webhook-Verwaltung für Pro Community Organisationen
// CRUD für Webhook-Konfigurationen (nur org_admin)

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { isValidWebhookUrl } from '@/lib/webhooks';
import { requireAuth, requireSubscription, requireOrgAccess, requireAdmin, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/organizations/[id]/webhooks
 * Listet alle konfigurierten Webhooks der Organisation auf.
 * Secret wird NICHT zurückgegeben (nur die letzten 4 Zeichen).
 * Erfordert Pro-Abo + org_admin oder Plattform-Admin.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'pro');
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, 'admin');
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  const serviceDb = getServiceDb();

  const { data: webhooks, error } = await serviceDb
    .from('org_webhooks')
    .select('id, org_id, url, events, secret, created_at, active')
    .eq('org_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[organizations/webhooks] GET Fehler:', error);
    return NextResponse.json({ error: 'Webhooks konnten nicht geladen werden' }, { status: 500 });
  }

  // Secret maskieren: nur die letzten 4 Zeichen anzeigen
  const masked = (webhooks ?? []).map((w) => ({
    ...w,
    secret: w.secret ? `****${w.secret.slice(-4)}` : null,
  }));

  return NextResponse.json(masked);
}

/**
 * POST /api/organizations/[id]/webhooks
 * Registriert einen neuen Webhook.
 * Body: { url: string, events?: string[] }
 * URL muss HTTPS verwenden. Secret wird automatisch generiert.
 * Erfordert Pro-Abo + org_admin oder Plattform-Admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'pro');
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, 'admin');
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const url = body.url as string | undefined;
  const events = (body.events as string[] | undefined) ?? ['*'];

  // URL Validierung
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
  }

  if (!isValidWebhookUrl(url)) {
    return NextResponse.json(
      { error: 'Webhook-URL muss HTTPS verwenden' },
      { status: 400 }
    );
  }

  // Secret generieren (32 Bytes = 64 Hex-Zeichen)
  const secret = randomBytes(32).toString('hex');

  const serviceDb = getServiceDb();

  const { data: webhook, error } = await serviceDb
    .from('org_webhooks')
    .insert({
      org_id: id,
      url,
      events,
      secret,
      active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[organizations/webhooks] POST Fehler:', error);
    return NextResponse.json({ error: 'Webhook konnte nicht erstellt werden' }, { status: 500 });
  }

  // Audit-Log
  await serviceDb
    .from('org_audit_log')
    .insert({
      org_id: id,
      user_id: auth.user.id,
      action: 'webhook_created',
      details: { url, events },
    });

  // Secret wird EINMALIG bei Erstellung zurückgegeben
  return NextResponse.json(webhook, { status: 201 });
}

/**
 * DELETE /api/organizations/[id]/webhooks
 * Entfernt einen Webhook.
 * Body: { webhook_id: string }
 * Erfordert Pro-Abo + org_admin oder Plattform-Admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'pro');
  if (sub instanceof NextResponse) return sub;

  // Org-Zugriffs-Guard: Admin-Rolle erforderlich (oder Plattform-Admin als Fallback)
  const org = await requireOrgAccess(auth.supabase, auth.user.id, id, 'admin');
  if (org instanceof NextResponse) {
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const webhookId = body.webhook_id as string | undefined;
  if (!webhookId) {
    return NextResponse.json({ error: 'webhook_id ist erforderlich' }, { status: 400 });
  }

  const serviceDb = getServiceDb();

  // Prüfen ob Webhook zur Organisation gehört
  const { data: existing } = await serviceDb
    .from('org_webhooks')
    .select('id, url')
    .eq('id', webhookId)
    .eq('org_id', id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Webhook nicht gefunden' }, { status: 404 });
  }

  const { error } = await serviceDb
    .from('org_webhooks')
    .delete()
    .eq('id', webhookId);

  if (error) {
    console.error('[organizations/webhooks] DELETE Fehler:', error);
    return NextResponse.json({ error: 'Webhook konnte nicht gelöscht werden' }, { status: 500 });
  }

  // Audit-Log
  await serviceDb
    .from('org_audit_log')
    .insert({
      org_id: id,
      user_id: auth.user.id,
      action: 'webhook_deleted',
      details: { webhook_id: webhookId, url: existing.url },
    });

  return NextResponse.json({ success: true });
}
