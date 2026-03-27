import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateReportWeight } from '@/lib/moderation/report-weight';
import type { ReportReason } from '@/lib/moderation/types';

const VALID_REASONS: ReportReason[] = [
  'spam', 'harassment', 'hate', 'scam', 'inappropriate', 'wrong_category', 'other',
];

// POST /api/moderation/report — Inhalt melden
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth-Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  // Body parsen
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { contentType, contentId, reasonCategory, reasonText } = body;

  // Pflichtfelder validieren
  if (!contentType || !contentId || !reasonCategory) {
    return NextResponse.json(
      { error: 'contentType, contentId und reasonCategory sind erforderlich' },
      { status: 400 },
    );
  }

  if (!VALID_REASONS.includes(reasonCategory)) {
    return NextResponse.json({ error: 'Ungültiger Meldegrund' }, { status: 400 });
  }

  // Doppel-Meldung prüfen
  const { data: existingReport } = await supabase
    .from('content_reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();

  if (existingReport) {
    return NextResponse.json(
      { error: 'Sie haben diesen Inhalt bereits gemeldet' },
      { status: 409 },
    );
  }

  // Report-Gewicht berechnen
  const { data: profile } = await supabase
    .from('users')
    .select('created_at, household_id, verified')
    .eq('id', user.id)
    .single();

  const accountAgeDays = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Fallback: verifiziert wenn Feld vorhanden, sonst Account aelter als 30 Tage
  const reporterVerified = profile?.verified ?? accountAgeDays >= 30;

  // Haushalt-Reports auf denselben Content zählen
  let householdReportsOnSameContent = 0;
  if (profile?.household_id) {
    const { count } = await supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .neq('reporter_id', user.id)
      .in('reporter_id',
        // Sub-Query: alle User im selben Haushalt
        (await supabase
          .from('users')
          .select('id')
          .eq('household_id', profile.household_id)
          .neq('id', user.id)
        ).data?.map((u: { id: string }) => u.id) ?? [],
      );
    householdReportsOnSameContent = count ?? 0;
  }

  const weight = calculateReportWeight({
    reporterVerified,
    accountAgeDays,
    householdReportsOnSameContent,
  });

  // Report einfügen
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    content_type: contentType,
    content_id: contentId,
    reason_category: reasonCategory,
    reason_text: reasonText || null,
    weight,
  });

  if (error) {
    console.error('[moderation] Report-Erstellung fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Meldung konnte nicht erstellt werden' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Danke, wir prüfen das.' });
}
