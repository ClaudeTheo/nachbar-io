// app/api/testing/session/route.ts
// Nachbar.io — Test-Session erstellen (POST) und laden (GET)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllActiveTestPoints } from '@/lib/testing/test-config';
import { sendTestReportEmail } from '@/lib/email';

// GET /api/testing/session — Aktive Session + Ergebnisse laden
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Tester-Check
  const { data: profile } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();

  if (!profile?.is_tester) {
    return NextResponse.json({ error: 'Kein Tester-Zugang' }, { status: 403 });
  }

  // Aktive Session laden (neueste zuerst)
  const { data: session, error: sessionError } = await supabase
    .from('test_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    console.error('[testing/session] Session laden fehlgeschlagen:', sessionError);
    return NextResponse.json({ error: 'Session konnte nicht geladen werden' }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ session: null, results: [] });
  }

  // Ergebnisse laden
  const { data: results, error: resultsError } = await supabase
    .from('test_results')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  if (resultsError) {
    console.error('[testing/session] Ergebnisse laden fehlgeschlagen:', resultsError);
    return NextResponse.json({ error: 'Ergebnisse konnten nicht geladen werden' }, { status: 500 });
  }

  return NextResponse.json({ session, results: results ?? [] });
}

// POST /api/testing/session — Neue Session starten
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Tester-Check
  const { data: profile } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();

  if (!profile?.is_tester) {
    return NextResponse.json({ error: 'Kein Tester-Zugang' }, { status: 403 });
  }

  // Pruefen: Schon aktive Session vorhanden?
  const { data: existingSession } = await supabase
    .from('test_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existingSession) {
    return NextResponse.json(
      { error: 'Es gibt bereits eine aktive Test-Session. Bitte schliessen Sie diese zuerst ab.' },
      { status: 409 }
    );
  }

  // Body parsen
  let body: {
    app_version?: string;
    device_type?: string;
    browser_info?: string;
    started_from_route?: string;
    test_run_label?: string;
  } = {};
  try { body = await request.json(); } catch { /* leerer body ok */ }

  // Session erstellen
  const { data: session, error: sessionError } = await supabase
    .from('test_sessions')
    .insert({
      user_id: user.id,
      app_version: body.app_version ?? null,
      device_type: body.device_type ?? null,
      browser_info: body.browser_info ?? null,
      started_from_route: body.started_from_route ?? null,
      test_run_label: body.test_run_label ?? null,
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('[testing/session] Session erstellen fehlgeschlagen:', sessionError);
    return NextResponse.json({ error: 'Session konnte nicht erstellt werden' }, { status: 500 });
  }

  // Initiale test_results fuer alle aktiven Testpunkte anlegen
  const activePoints = getAllActiveTestPoints();
  const initialResults = activePoints.map(point => ({
    session_id: session.id,
    test_point_id: point.id,
    status: 'open' as const,
  }));

  // Batch-Insert (Supabase unterstuetzt bulk insert)
  const { error: resultsError } = await supabase
    .from('test_results')
    .insert(initialResults);

  if (resultsError) {
    console.error('[testing/session] Initiale Ergebnisse erstellen fehlgeschlagen:', resultsError);
    // Session trotzdem zurueckgeben — Ergebnisse koennen spaeter nachgeladen werden
  }

  // Alle Ergebnisse laden fuer die Response
  const { data: results } = await supabase
    .from('test_results')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ session, results: results ?? [] }, { status: 201 });
}

// PATCH /api/testing/session — Session aktualisieren (abschliessen, Feedback)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: {
    status?: 'completed' | 'abandoned';
    final_feedback?: string;
    usability_rating?: number;
    confidence_rating?: number;
    visited_routes?: { route: string; first_visit: string; visit_count: number }[];
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Aktive Session finden
  const { data: session } = await supabase
    .from('test_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: 'Keine aktive Session gefunden' }, { status: 404 });
  }

  // Summary berechnen wenn Session abgeschlossen wird
  let summary = {};
  if (body.status === 'completed' || body.status === 'abandoned') {
    const { data: results } = await supabase
      .from('test_results')
      .select('status, test_point_id, comment, severity')
      .eq('session_id', session.id);

    if (results) {
      const total = results.length;
      const passed = results.filter(r => r.status === 'passed').length;
      const partial = results.filter(r => r.status === 'partial').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;
      const open = results.filter(r => r.status === 'open').length;

      summary = {
        total,
        passed,
        partial,
        failed,
        skipped,
        open,
        progressPercent: total > 0 ? Math.round(((passed + partial + failed + skipped) / total) * 100) : 0,
        failedPoints: results
          .filter(r => r.status === 'failed')
          .map(r => ({ id: r.test_point_id, comment: r.comment, severity: r.severity })),
      };
    }
  }

  // Session aktualisieren
  const updateData: Record<string, unknown> = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === 'completed' || body.status === 'abandoned') {
      updateData.completed_at = new Date().toISOString();
      updateData.summary = summary;
    }
  }
  if (body.final_feedback !== undefined) updateData.final_feedback = body.final_feedback;
  if (body.usability_rating !== undefined) updateData.usability_rating = body.usability_rating;
  if (body.confidence_rating !== undefined) updateData.confidence_rating = body.confidence_rating;

  // Visited Routes mergen (Client sendet aktuelle Liste, Server merged mit bestehenden)
  if (body.visited_routes && Array.isArray(body.visited_routes)) {
    // Bestehende Routen laden
    const { data: currentSession } = await supabase
      .from('test_sessions')
      .select('visited_routes')
      .eq('id', session.id)
      .single();

    const existingRoutes: { route: string; first_visit: string; visit_count: number }[] =
      (currentSession?.visited_routes as { route: string; first_visit: string; visit_count: number }[]) ?? [];
    const routeMap = new Map(existingRoutes.map(r => [r.route, r]));

    // Neue Routen mergen (hoehere visit_count gewinnt, frueherer first_visit bleibt)
    for (const newRoute of body.visited_routes) {
      const existing = routeMap.get(newRoute.route);
      if (existing) {
        routeMap.set(newRoute.route, {
          route: newRoute.route,
          first_visit: existing.first_visit < newRoute.first_visit ? existing.first_visit : newRoute.first_visit,
          visit_count: Math.max(existing.visit_count, newRoute.visit_count),
        });
      } else {
        routeMap.set(newRoute.route, newRoute);
      }
    }

    updateData.visited_routes = Array.from(routeMap.values());
  }

  const { data: updated, error: updateError } = await supabase
    .from('test_sessions')
    .update(updateData)
    .eq('id', session.id)
    .select()
    .single();

  if (updateError) {
    console.error('[testing/session] Session aktualisieren fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Session konnte nicht aktualisiert werden' }, { status: 500 });
  }

  // Bei Abschluss: Test-Report per E-Mail an Admin senden (fire-and-forget)
  if (body.status === 'completed' && process.env.ADMIN_EMAIL) {
    const { data: testerProfile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const { data: allResults } = await supabase
      .from('test_results')
      .select('*')
      .eq('session_id', session.id);

    sendTestReportEmail({
      to: process.env.ADMIN_EMAIL,
      testerName: testerProfile?.display_name ?? 'Unbekannt',
      session: updated,
      results: allResults ?? [],
    }).catch((err: unknown) => {
      console.error('[testing/session] Report-E-Mail fehlgeschlagen:', err);
    });
  }

  return NextResponse.json(updated);
}
