// app/api/export/route.ts
// Nachbar.io — CSV/XLSX-Export API für B2B-Organisationen
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateTypedCsv,
  generateTypedXlsx,
  getExportFilename,
  type ExportFormat,
  type ExportType,
  type ExportRow,
} from '@/lib/export';

const VALID_TYPES: ExportType[] = ['quarter_stats', 'activity_report', 'escalation_report'];
const VALID_FORMATS: ExportFormat[] = ['csv', 'xlsx'];
const MAX_ROWS = 10_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as ExportType;
  const format = (searchParams.get('format') ?? 'csv') as ExportFormat;
  const quarterId = searchParams.get('quarter_id');

  // Validierung
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Ungültiger Typ. Erlaubt: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Ungültiges Format. Erlaubt: ${VALID_FORMATS.join(', ')}` },
      { status: 400 }
    );
  }

  // Auth prüfen
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Rolle prüfen: nur admin + org_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'org_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  // Daten laden
  let rows: ExportRow[] = [];

  try {
    switch (type) {
      case 'quarter_stats': {
        let query = supabase
          .from('analytics_snapshots')
          .select('snapshot_date, wah, total_users, active_users_7d, active_users_30d, new_registrations, activation_rate, retention_7d, posts_count, events_count, heartbeat_coverage, escalation_count, plus_subscribers, mrr')
          .order('snapshot_date', { ascending: false })
          .limit(MAX_ROWS);

        if (quarterId) {
          query = query.eq('quarter_id', quarterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        rows = (data ?? []) as ExportRow[];
        break;
      }

      case 'escalation_report': {
        let query = supabase
          .from('escalation_events')
          .select('created_at, level, status, resolved_at')
          .order('created_at', { ascending: false })
          .limit(MAX_ROWS);

        if (quarterId) {
          query = query.eq('quarter_id', quarterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        // Anonymisierung: User-ID hashen
        rows = (data ?? []).map((row: Record<string, unknown>, i: number) => ({
          ...row,
          user_id_anon: `Nutzer-${String(i + 1).padStart(3, '0')}`,
        })) as ExportRow[];
        break;
      }

      case 'activity_report': {
        // Aggregierter Aktivitätsbericht aus analytics_snapshots
        let query = supabase
          .from('analytics_snapshots')
          .select('snapshot_date, posts_count, events_count, wah, active_users_7d')
          .order('snapshot_date', { ascending: false })
          .limit(MAX_ROWS);

        if (quarterId) {
          query = query.eq('quarter_id', quarterId);
        }

        const { data, error } = await query;
        if (error) throw error;
        rows = (data ?? []) as ExportRow[];
        break;
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Fehler beim Laden: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  // Audit-Log-Eintrag
  await supabase.from('org_audit_log').insert({
    user_id: user.id,
    action: 'export_data',
    details: { type, format, row_count: rows.length, quarter_id: quarterId },
  }).then(() => {/* ignoriere Fehler */});

  // Export generieren
  const filename = getExportFilename(type, format);

  if (format === 'xlsx') {
    const buffer = generateTypedXlsx(rows, type);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  const csv = generateTypedCsv(rows, type);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
