// app/api/organizations/route.ts
// Nachbar.io — Organisationen: Auflisten (GET) und Erstellen (POST)

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { validateOrgCreate } from '@/lib/organizations';
import { requireAuth, requireSubscription, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

// Service-Client fuer Admin-Operationen (Insert umgeht RLS)
function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/organizations
 * Eigene Organisationen auflisten (via RLS: nur Orgs wo User Mitglied ist).
 * Admins sehen alle Organisationen.
 */
export async function GET() {
  // Auth-Guard (kein Abo-Gate — eigene Orgs auflisten ist erlaubt)
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // RLS filtert automatisch auf Orgs, in denen der User Mitglied ist (oder Admin)
  const { data, error } = await auth.supabase
    .from('organizations')
    .select('*, org_members(id, user_id, role, assigned_quarters)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[organizations] GET Fehler:', error);
    return NextResponse.json({ error: 'Organisationen konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/organizations
 * Neue Organisation erstellen. Nur fuer Plattform-Admins mit Pro-Abo (is_admin = true).
 * Body: { name, type, hr_vr_number, contact_email, contact_phone?, address? }
 */
export async function POST(request: NextRequest) {
  // Auth-Guard
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Abo-Guard: Pro erforderlich
  const sub = await requireSubscription(auth.supabase, auth.user.id, 'pro');
  if (sub instanceof NextResponse) return sub;

  // Nur Plattform-Admins duerfen Organisationen erstellen
  const { data: profile } = await auth.supabase
    .from('users')
    .select('is_admin')
    .eq('id', auth.user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: 'Nur Plattform-Administratoren duerfen Organisationen erstellen' },
      { status: 403 }
    );
  }

  // Body parsen
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung
  const validation = validateOrgCreate(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Organisation erstellen (Service-Client fuer INSERT ohne RLS-Policy)
  const serviceDb = getServiceDb();
  const { data: org, error: insertError } = await serviceDb
    .from('organizations')
    .insert({
      name: (body.name as string).trim(),
      type: body.type as string,
      hr_vr_number: (body.hr_vr_number as string).trim(),
      contact_email: (body.contact_email as string).trim().toLowerCase(),
      contact_phone: body.contact_phone ? (body.contact_phone as string).trim() : null,
      address: body.address ? (body.address as string).trim() : null,
      verification_status: 'pending',
    })
    .select()
    .single();

  if (insertError || !org) {
    console.error('[organizations] POST Insert-Fehler:', insertError);
    return NextResponse.json({ error: 'Organisation konnte nicht erstellt werden' }, { status: 500 });
  }

  // Audit-Log: Organisation erstellt
  await serviceDb
    .from('org_audit_log')
    .insert({
      org_id: org.id,
      user_id: auth.user.id,
      action: 'org_created',
      details: { name: org.name, type: org.type },
    });

  return NextResponse.json(org, { status: 201 });
}
