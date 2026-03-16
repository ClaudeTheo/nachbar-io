// app/api/testing/admin/route.ts
// Nachbar.io — Admin-Uebersicht aller Tester + Fortschritt

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/testing/admin — Alle Tester mit Fortschritt (nur Admin)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Admin-Check
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Nur fuer Admins' }, { status: 403 });
  }

  // Query-Parameter fuer Filter
  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get('status');    // 'active' | 'completed' | 'abandoned'
  const format = searchParams.get('format');           // 'csv' fuer Export

  // Alle Tester laden
  const { data: testers, error: testerError } = await supabase
    .from('users')
    .select('id, display_name, email_hash')
    .eq('is_tester', true)
    .order('display_name', { ascending: true });

  if (testerError) {
    console.error('[testing/admin] Tester laden fehlgeschlagen:', testerError);
    return NextResponse.json({ error: 'Tester konnten nicht geladen werden' }, { status: 500 });
  }

  if (!testers || testers.length === 0) {
    return NextResponse.json({ testers: [], stats: { totalTesters: 0 } });
  }

  // Alle Sessions laden
  let sessionQuery = supabase
    .from('test_sessions')
    .select('*')
    .in('user_id', testers.map(t => t.id))
    .order('created_at', { ascending: false });

  if (statusFilter) {
    sessionQuery = sessionQuery.eq('status', statusFilter);
  }

  const { data: sessions } = await sessionQuery;

  // Alle Ergebnisse fuer diese Sessions laden
  const sessionIds = (sessions ?? []).map(s => s.id);
  let allResults: { session_id: string; status: string; test_point_id: string; severity: string | null; issue_type: string | null; comment: string | null }[] = [];

  if (sessionIds.length > 0) {
    const { data: results } = await supabase
      .from('test_results')
      .select('session_id, status, test_point_id, severity, issue_type, comment')
      .in('session_id', sessionIds);
    allResults = results ?? [];
  }

  // Pro Tester aggregieren
  const testerOverviews = testers.map(tester => {
    // Neueste Session dieses Testers
    const testerSessions = (sessions ?? []).filter(s => s.user_id === tester.id);
    const latestSession = testerSessions[0] ?? null;

    // Ergebnisse fuer die neueste Session
    const sessionResults = latestSession
      ? allResults.filter(r => r.session_id === latestSession.id)
      : [];

    const total = sessionResults.length;
    const passed = sessionResults.filter(r => r.status === 'passed').length;
    const partial = sessionResults.filter(r => r.status === 'partial').length;
    const failed = sessionResults.filter(r => r.status === 'failed').length;
    const skipped = sessionResults.filter(r => r.status === 'skipped').length;
    const open = sessionResults.filter(r => r.status === 'open').length;
    const done = passed + partial + failed + skipped;

    return {
      user_id: tester.id,
      display_name: tester.display_name,
      session_id: latestSession?.id ?? null,
      session_status: latestSession?.status ?? null,
      started_at: latestSession?.started_at ?? null,
      completed_at: latestSession?.completed_at ?? null,
      test_run_label: latestSession?.test_run_label ?? null,
      total,
      passed,
      partial,
      failed,
      skipped,
      open,
      progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      usability_rating: latestSession?.usability_rating ?? null,
      confidence_rating: latestSession?.confidence_rating ?? null,
      total_sessions: testerSessions.length,
    };
  });

  // Gesamt-Statistiken
  const totalTesters = testers.length;
  const activeTesters = testerOverviews.filter(t => t.session_status === 'active').length;
  const completedTesters = testerOverviews.filter(t => t.session_status === 'completed').length;
  const avgProgress = testerOverviews.length > 0
    ? Math.round(testerOverviews.reduce((sum, t) => sum + t.progressPercent, 0) / testerOverviews.length)
    : 0;

  // Haeufigste Fehler (Top 10)
  const failedResults = allResults.filter(r => r.status === 'failed');
  const failedByPoint = new Map<string, number>();
  for (const r of failedResults) {
    failedByPoint.set(r.test_point_id, (failedByPoint.get(r.test_point_id) ?? 0) + 1);
  }
  const topFailedPoints = Array.from(failedByPoint.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pointId, count]) => ({ pointId, count }));

  // Fehler nach Severity
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const r of failedResults) {
    if (r.severity && r.severity in severityCounts) {
      severityCounts[r.severity as keyof typeof severityCounts]++;
    }
  }

  // Fehler nach Issue-Type
  const issueTypeCounts: Record<string, number> = {};
  for (const r of failedResults) {
    if (r.issue_type) {
      issueTypeCounts[r.issue_type] = (issueTypeCounts[r.issue_type] ?? 0) + 1;
    }
  }

  // CSV-Export (L1: CSV-Injection-Schutz)
  if (format === 'csv') {
    // Fuehrende Sonderzeichen escapen die Formeln ausloesen koennten (=, +, -, @, \t, \r)
    const csvSafe = (val: string) => {
      if (/^[=+\-@\t\r]/.test(val)) return `'${val}`;
      return val;
    };
    const header = 'Tester,Session-Status,Fortschritt %,Bestanden,Teilweise,Fehlgeschlagen,Uebersprungen,Offen,Usability,Vertrauen\n';
    const rows = testerOverviews.map(t =>
      `"${csvSafe(t.display_name)}",${t.session_status ?? 'keine'},${t.progressPercent},${t.passed},${t.partial},${t.failed},${t.skipped},${t.open},${t.usability_rating ?? '-'},${t.confidence_rating ?? '-'}`
    ).join('\n');

    return new NextResponse(header + rows, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="test-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    testers: testerOverviews,
    stats: {
      totalTesters,
      activeTesters,
      completedTesters,
      avgProgress,
      topFailedPoints,
      severityCounts,
      issueTypeCounts,
    },
  });
}
