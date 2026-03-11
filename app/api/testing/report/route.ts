// app/api/testing/report/route.ts
// Nachbar.io — Test-Report / Zusammenfassung

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TEST_PATHS } from '@/lib/testing/test-config';

// GET /api/testing/report — Zusammenfassung fuer aktuellen Tester (oder Admin)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Optional: session_id als Query-Param (fuer Admin-Zugriff auf fremde Sessions)
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('session_id');

  let session;
  let results;

  if (sessionId) {
    // Admin darf fremde Sessions sehen
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    // Session laden (RLS prueft: eigene Session ODER Admin)
    const { data: s, error } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !s) {
      return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 });
    }

    // Zugriffspruefung: eigene Session oder Admin
    if (s.user_id !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: 'Kein Zugriff auf diese Session' }, { status: 403 });
    }

    session = s;

    const { data: r } = await supabase
      .from('test_results')
      .select('*')
      .eq('session_id', sessionId);
    results = r ?? [];
  } else {
    // Eigene neueste Session
    const { data: s } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!s) {
      return NextResponse.json({ error: 'Keine Session gefunden' }, { status: 404 });
    }
    session = s;

    const { data: r } = await supabase
      .from('test_results')
      .select('*')
      .eq('session_id', s.id);
    results = r ?? [];
  }

  // Report generieren
  const resultMap = new Map(results.map(r => [r.test_point_id, r]));

  // Pro-Pfad Statistiken
  const pathReports = TEST_PATHS.map(path => {
    const pathResults = path.points
      .filter(p => p.active)
      .map(p => resultMap.get(p.id))
      .filter(Boolean);

    const total = pathResults.length;
    const passed = pathResults.filter(r => r!.status === 'passed').length;
    const partial = pathResults.filter(r => r!.status === 'partial').length;
    const failed = pathResults.filter(r => r!.status === 'failed').length;
    const skipped = pathResults.filter(r => r!.status === 'skipped').length;
    const open = pathResults.filter(r => r!.status === 'open').length;
    const done = passed + partial + failed + skipped;

    return {
      pathId: path.id,
      pathName: path.name,
      total,
      passed,
      partial,
      failed,
      skipped,
      open,
      progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      failedPoints: pathResults
        .filter(r => r!.status === 'failed')
        .map(r => ({
          id: r!.test_point_id,
          comment: r!.comment,
          severity: r!.severity,
          issue_type: r!.issue_type,
        })),
    };
  });

  // Gesamt-Statistiken
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const open = results.filter(r => r.status === 'open').length;
  const done = passed + partial + failed + skipped;

  // Dauer berechnen (falls Session abgeschlossen)
  let durationMinutes: number | null = null;
  if (session.completed_at && session.started_at) {
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.completed_at).getTime();
    durationMinutes = Math.round((end - start) / 60000);
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      started_at: session.started_at,
      completed_at: session.completed_at,
      usability_rating: session.usability_rating,
      confidence_rating: session.confidence_rating,
      final_feedback: session.final_feedback,
      test_run_label: session.test_run_label,
    },
    summary: {
      total,
      passed,
      partial,
      failed,
      skipped,
      open,
      progressPercent: total > 0 ? Math.round((done / total) * 100) : 0,
      durationMinutes,
    },
    paths: pathReports,
  });
}
