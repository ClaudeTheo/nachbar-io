// app/api/bug-reports/anonymous/route.ts
// Anonymer Bug-Report Endpoint (ohne Login)
// Spam-Schutz: Honeypot (Client) + Rate-Limit (Server) + Turnstile (vorbereitet)

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

const MAX_REPORTS_PER_HOUR = 3;

// Fingerprint aus Request-Headers berechnen (DSGVO-konform, kein Klartext)
function getFingerprint(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ua = req.headers.get('user-agent') || '';
  const lang = req.headers.get('accept-language') || '';
  const raw = `${ip}|${ua}|${lang}`;
  return createHash('sha256').update(raw).digest('hex');
}

// IP-Hash fuer bug_reports.ip_hash (nur IP, kein Fingerprint)
function getIpHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(ip).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Schicht 1: Honeypot — wenn ausgefuellt, still ignorieren
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    const admin = getAdminSupabase();
    const fingerprint = getFingerprint(req);

    // Schicht 2: Rate-Limit pruefen
    // Alte Eintraege aufraeumen (> 1 Stunde)
    await admin
      .from('bug_report_rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    // Aktuellen Zaehler pruefen
    const { data: rateLimit } = await admin
      .from('bug_report_rate_limits')
      .select('report_count, window_start')
      .eq('fingerprint_hash', fingerprint)
      .single();

    if (rateLimit && rateLimit.report_count >= MAX_REPORTS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Zu viele Bug-Reports. Bitte versuchen Sie es spaeter erneut.' },
        { status: 429 }
      );
    }

    // Rate-Limit Zaehler erhoehen
    if (rateLimit) {
      await admin
        .from('bug_report_rate_limits')
        .update({ report_count: rateLimit.report_count + 1 })
        .eq('fingerprint_hash', fingerprint);
    } else {
      await admin
        .from('bug_report_rate_limits')
        .insert({ fingerprint_hash: fingerprint, report_count: 1 });
    }

    // Validierung
    if (!body.page_url || typeof body.page_url !== 'string') {
      return NextResponse.json({ error: 'page_url ist erforderlich' }, { status: 400 });
    }

    // Bug-Report speichern (Admin-Client bypassed RLS)
    const { error: insertError } = await admin
      .from('bug_reports')
      .insert({
        user_id: null,
        quarter_id: null,
        page_url: body.page_url,
        page_title: body.page_title || null,
        screenshot_url: body.screenshot_url || null,
        console_errors: body.console_errors || [],
        browser_info: body.browser_info || {},
        page_meta: body.page_meta || {},
        user_comment: typeof body.user_comment === 'string'
          ? body.user_comment.slice(0, 500)
          : null,
        source: 'anonymous',
        ip_hash: getIpHash(req),
        status: 'new',
      });

    if (insertError) {
      console.error('[BugReport] Anonymer Insert fehlgeschlagen:', insertError);
      return NextResponse.json({ error: 'Bug-Report konnte nicht gespeichert werden' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[BugReport] Anonymer Endpoint Fehler:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
