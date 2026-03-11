// app/api/testing/result/route.ts
// Nachbar.io — Testpunkt-Ergebnis speichern (POST) und aktualisieren (PATCH)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TestStatus, IssueSeverity, IssueType } from '@/lib/testing/types';

const VALID_STATUSES: TestStatus[] = ['open', 'passed', 'partial', 'failed', 'skipped'];
const VALID_SEVERITIES: IssueSeverity[] = ['low', 'medium', 'high', 'critical'];
const VALID_ISSUE_TYPES: IssueType[] = ['ui', 'ux', 'functional', 'performance', 'security', 'text', 'accessibility'];

// POST /api/testing/result — Neues Ergebnis speichern (Upsert)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
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

  // Body parsen
  let body: {
    test_point_id?: string;
    status?: TestStatus;
    comment?: string;
    severity?: IssueSeverity;
    issue_type?: IssueType;
    screenshot_url?: string;
    duration_seconds?: number;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  // Validierung
  if (!body.test_point_id || typeof body.test_point_id !== 'string') {
    return NextResponse.json({ error: 'test_point_id ist erforderlich' }, { status: 400 });
  }
  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Ungueltiger Status. Erlaubt: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }
  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    return NextResponse.json({ error: `Ungueltiger Schweregrad. Erlaubt: ${VALID_SEVERITIES.join(', ')}` }, { status: 400 });
  }
  if (body.issue_type && !VALID_ISSUE_TYPES.includes(body.issue_type)) {
    return NextResponse.json({ error: `Ungueltiger Issue-Typ. Erlaubt: ${VALID_ISSUE_TYPES.join(', ')}` }, { status: 400 });
  }
  if (body.comment && body.comment.length > 5000) {
    return NextResponse.json({ error: 'Kommentar darf max. 5000 Zeichen lang sein' }, { status: 400 });
  }

  // Ergebnis suchen (existiert bereits durch Session-Init)
  const { data: existing } = await supabase
    .from('test_results')
    .select('id')
    .eq('session_id', session.id)
    .eq('test_point_id', body.test_point_id)
    .maybeSingle();

  if (existing) {
    // Update bestehendes Ergebnis
    const { data: result, error } = await supabase
      .from('test_results')
      .update({
        status: body.status,
        comment: body.comment ?? null,
        severity: body.severity ?? null,
        issue_type: body.issue_type ?? null,
        screenshot_url: body.screenshot_url ?? null,
        duration_seconds: body.duration_seconds ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[testing/result] Ergebnis aktualisieren fehlgeschlagen:', error);
      return NextResponse.json({ error: 'Ergebnis konnte nicht aktualisiert werden' }, { status: 500 });
    }
    return NextResponse.json(result);
  }

  // Neues Ergebnis erstellen (Fallback falls Session-Init fehlschlug)
  const { data: result, error } = await supabase
    .from('test_results')
    .insert({
      session_id: session.id,
      test_point_id: body.test_point_id,
      status: body.status,
      comment: body.comment ?? null,
      severity: body.severity ?? null,
      issue_type: body.issue_type ?? null,
      screenshot_url: body.screenshot_url ?? null,
      duration_seconds: body.duration_seconds ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('[testing/result] Ergebnis erstellen fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Ergebnis konnte nicht gespeichert werden' }, { status: 500 });
  }

  return NextResponse.json(result, { status: 201 });
}

// PATCH /api/testing/result — Bestehendes Ergebnis aktualisieren
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body: {
    result_id?: string;
    status?: TestStatus;
    comment?: string;
    severity?: IssueSeverity;
    issue_type?: IssueType;
    screenshot_url?: string;
    duration_seconds?: number;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  if (!body.result_id) {
    return NextResponse.json({ error: 'result_id ist erforderlich' }, { status: 400 });
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Ungueltiger Status. Erlaubt: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }
  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    return NextResponse.json({ error: `Ungueltiger Schweregrad` }, { status: 400 });
  }
  if (body.issue_type && !VALID_ISSUE_TYPES.includes(body.issue_type)) {
    return NextResponse.json({ error: `Ungueltiger Issue-Typ` }, { status: 400 });
  }

  // Update-Objekt bauen (nur gesetzte Felder)
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) updateData.status = body.status;
  if (body.comment !== undefined) updateData.comment = body.comment;
  if (body.severity !== undefined) updateData.severity = body.severity;
  if (body.issue_type !== undefined) updateData.issue_type = body.issue_type;
  if (body.screenshot_url !== undefined) updateData.screenshot_url = body.screenshot_url;
  if (body.duration_seconds !== undefined) updateData.duration_seconds = body.duration_seconds;

  const { data: result, error } = await supabase
    .from('test_results')
    .update(updateData)
    .eq('id', body.result_id)
    .select()
    .single();

  if (error) {
    console.error('[testing/result] PATCH fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Ergebnis konnte nicht aktualisiert werden' }, { status: 500 });
  }

  return NextResponse.json(result);
}
