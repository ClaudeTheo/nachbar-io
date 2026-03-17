// app/api/organizations/[id]/export/route.ts
// Nachbar.io — CSV/XLSX-Export fuer Pro Community Organisationen
// Exportiert Bewohner, Alerts oder Check-ins als Datei-Download

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateCsv, generateXlsx } from '@/lib/export';
import { requireAuth, requireSubscription, requireOrgAccess, requireAdmin, unauthorizedResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

// Erlaubte Export-Typen und ihre Konfiguration
const EXPORT_TYPES = ['residents', 'alerts', 'checkins'] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

const EXPORT_FORMATS = ['csv', 'xlsx'] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Laedt Bewohner-Daten fuer den Export (anonymisiert fuer org_viewer).
 */
async function fetchResidents(orgId: string) {
  const serviceDb = getServiceDb();

  // Quartiere der Organisation ermitteln
  const { data: members } = await serviceDb
    .from('org_members')
    .select('assigned_quarters')
    .eq('org_id', orgId);

  const quarters = (members ?? [])
    .flatMap((m) => m.assigned_quarters ?? [])
    .filter((v, i, a) => a.indexOf(v) === i); // Deduplizieren

  if (quarters.length === 0) {
    return { headers: ['ID', 'Name', 'Quartier', 'Registriert'], rows: [] as string[][] };
  }

  const { data: residents } = await serviceDb
    .from('users')
    .select('id, display_name, quarter_id, created_at')
    .in('quarter_id', quarters);

  const headers = ['ID', 'Name', 'Quartier', 'Registriert'];
  const rows = (residents ?? []).map((r) => [
    r.id,
    r.display_name ?? 'Unbekannt',
    r.quarter_id ?? '',
    r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE') : '',
  ]);

  return { headers, rows };
}

/**
 * Laedt Alert-Daten fuer den Export.
 */
async function fetchAlerts(orgId: string) {
  const serviceDb = getServiceDb();

  const { data: alerts } = await serviceDb
    .from('emergency_alerts')
    .select('id, category, status, created_at, resolved_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1000);

  const headers = ['ID', 'Kategorie', 'Status', 'Erstellt', 'Geloest'];
  const rows = (alerts ?? []).map((a) => [
    a.id,
    a.category ?? '',
    a.status ?? '',
    a.created_at ? new Date(a.created_at).toLocaleDateString('de-DE') : '',
    a.resolved_at ? new Date(a.resolved_at).toLocaleDateString('de-DE') : '',
  ]);

  return { headers, rows };
}

/**
 * Laedt Check-in-Daten fuer den Export (anonymisiert).
 */
async function fetchCheckins(orgId: string) {
  const serviceDb = getServiceDb();

  // Quartiere der Organisation ermitteln
  const { data: members } = await serviceDb
    .from('org_members')
    .select('assigned_quarters')
    .eq('org_id', orgId);

  const quarters = (members ?? [])
    .flatMap((m) => m.assigned_quarters ?? [])
    .filter((v, i, a) => a.indexOf(v) === i);

  if (quarters.length === 0) {
    return { headers: ['Nutzer-ID', 'Status', 'Zeitpunkt'], rows: [] as string[][] };
  }

  const { data: checkins } = await serviceDb
    .from('checkins')
    .select('user_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  const headers = ['Nutzer-ID', 'Status', 'Zeitpunkt'];
  const rows = (checkins ?? []).map((c) => [
    c.user_id ?? '',
    c.status ?? '',
    c.created_at ? new Date(c.created_at).toISOString() : '',
  ]);

  return { headers, rows };
}

/**
 * GET /api/organizations/[id]/export?format=csv|xlsx&type=residents|alerts|checkins
 * Exportiert Organisationsdaten als CSV oder XLSX Datei-Download.
 * Erfordert Pro-Abo + org_admin oder Plattform-Admin.
 */
export async function GET(
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
    // Plattform-Admin hat immer Zugriff
    const isPlatformAdmin = await requireAdmin(auth.supabase, auth.user.id);
    if (!isPlatformAdmin) return org;
  }

  // Query-Parameter validieren
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') as ExportFormat | null;
  const type = searchParams.get('type') as ExportType | null;

  if (!format || !EXPORT_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: 'Ungueltiges Format. Erlaubt: csv, xlsx' },
      { status: 400 }
    );
  }

  if (!type || !EXPORT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: 'Ungueltiger Typ. Erlaubt: residents, alerts, checkins' },
      { status: 400 }
    );
  }

  // Daten laden
  let exportData: { headers: string[]; rows: string[][] };

  try {
    switch (type) {
      case 'residents':
        exportData = await fetchResidents(id);
        break;
      case 'alerts':
        exportData = await fetchAlerts(id);
        break;
      case 'checkins':
        exportData = await fetchCheckins(id);
        break;
    }
  } catch (error) {
    console.error(`[organizations/export] Fehler beim Laden von ${type}:`, error);
    return NextResponse.json(
      { error: 'Daten konnten nicht geladen werden' },
      { status: 500 }
    );
  }

  // Dateiname generieren
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `nachbar_${type}_${dateStr}.${format}`;

  // Export generieren
  if (format === 'csv') {
    const csv = generateCsv(exportData.headers, exportData.rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // XLSX
  const xlsxBuffer = generateXlsx(exportData.headers, exportData.rows);
  return new NextResponse(new Uint8Array(xlsxBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
