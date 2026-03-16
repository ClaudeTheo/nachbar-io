// app/api/organizations/[id]/webhooks/route.ts
// Nachbar.io — Webhook-Verwaltung fuer Pro Community Organisationen
// CRUD fuer Webhook-Konfigurationen (nur org_admin)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { isValidWebhookUrl } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Prueft ob der aktuelle User org_admin der Organisation ist.
 * Webhooks koennen nur von Admins verwaltet werden.
 */
async function requireOrgAdmin(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 }) };
  }

  // Mitgliedschaft und Rolle pruefen
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Plattform-Admin hat immer Zugriff
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const isOrgAdmin = membership?.role === 'admin';
  const isPlatformAdmin = profile?.is_admin === true;

  if (!isOrgAdmin && !isPlatformAdmin) {
    return { error: NextResponse.json(
      { error: 'Nur Organisations-Administratoren koennen Webhooks verwalten' },
      { status: 403 }
    ) };
  }

  return { user };
}

/**
 * GET /api/organizations/[id]/webhooks
 * Listet alle konfigurierten Webhooks der Organisation auf.
 * Secret wird NICHT zurueckgegeben (nur die letzten 4 Zeichen).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireOrgAdmin(id);
  if ('error' in access && access.error) return access.error;

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
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireOrgAdmin(id);
  if ('error' in access && access.error) return access.error;

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
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
      user_id: access.user!.id,
      action: 'webhook_created',
      details: { url, events },
    });

  // Secret wird EINMALIG bei Erstellung zurueckgegeben
  return NextResponse.json(webhook, { status: 201 });
}

/**
 * DELETE /api/organizations/[id]/webhooks
 * Entfernt einen Webhook.
 * Body: { webhook_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireOrgAdmin(id);
  if ('error' in access && access.error) return access.error;

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const webhookId = body.webhook_id as string | undefined;
  if (!webhookId) {
    return NextResponse.json({ error: 'webhook_id ist erforderlich' }, { status: 400 });
  }

  const serviceDb = getServiceDb();

  // Pruefen ob Webhook zur Organisation gehoert
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
    return NextResponse.json({ error: 'Webhook konnte nicht geloescht werden' }, { status: 500 });
  }

  // Audit-Log
  await serviceDb
    .from('org_audit_log')
    .insert({
      org_id: id,
      user_id: access.user!.id,
      action: 'webhook_deleted',
      details: { webhook_id: webhookId, url: existing.url },
    });

  return NextResponse.json({ success: true });
}
