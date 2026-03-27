// POST /api/hilfe/monthly-report/send — Sammelabrechnung per E-Mail senden
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMonthlyReportEmail } from '@/lib/hilfe/email';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { report_id, to_email } = await request.json();

  if (!report_id || !to_email) {
    return NextResponse.json({ error: 'report_id und to_email erforderlich' }, { status: 400 });
  }

  // Report laden (RLS stellt sicher: nur eigene)
  const { data: report } = await supabase
    .from('help_monthly_reports')
    .select('*')
    .eq('id', report_id)
    .single();

  if (!report) {
    return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
  }

  // PDF aus Storage laden
  const { data: pdfData, error: downloadError } = await supabase.storage
    .from('hilfe')
    .download(report.pdf_url.split('/hilfe/')[1] || '');

  if (downloadError || !pdfData) {
    return NextResponse.json({ error: 'PDF konnte nicht geladen werden' }, { status: 500 });
  }

  const pdfBuffer = Buffer.from(await pdfData.arrayBuffer());

  // Helfer- und Senior-Namen laden
  const { data: helperUser } = await supabase.auth.admin.getUserById(user.id);
  const { data: seniorUser } = await supabase.auth.admin.getUserById(report.resident_id);

  const result = await sendMonthlyReportEmail({
    to: to_email,
    helperName: helperUser?.user?.user_metadata?.full_name || 'Helfer',
    seniorName: seniorUser?.user?.user_metadata?.full_name || 'Bewohner',
    monthYear: report.month_year,
    totalSessions: report.total_sessions,
    totalAmountCents: report.total_amount_cents,
    pdfBuffer,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Report als gesendet markieren
  await supabase
    .from('help_monthly_reports')
    .update({ sent_to_email: to_email, sent_at: new Date().toISOString() })
    .eq('id', report_id);

  return NextResponse.json({ success: true });
}
