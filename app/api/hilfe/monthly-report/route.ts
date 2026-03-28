// GET /api/hilfe/monthly-report?resident_id=X&month=2026-03 — Sammelabrechnung laden/generieren
// POST /api/hilfe/monthly-report — Sammelabrechnung generieren + PDF speichern
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMonthlyReport } from '@/modules/hilfe/services/pdf-monthly-report';
import { canAccessBilling } from '@/modules/hilfe/services/feature-gate';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const residentId = request.nextUrl.searchParams.get('resident_id');
  const month = request.nextUrl.searchParams.get('month');

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from('neighborhood_helpers')
    .select('id, subscription_status, trial_receipt_used')
    .eq('user_id', user.id)
    .single();

  if (!helper) return NextResponse.json({ error: 'Kein Helfer-Profil' }, { status: 404 });

  // Feature-Gate prüfen
  if (!canAccessBilling(helper.subscription_status, helper.trial_receipt_used)) {
    return NextResponse.json({ error: 'Abrechnungs-Modul erforderlich' }, { status: 403 });
  }

  // Bestehende Reports laden
  let query = supabase
    .from('help_monthly_reports')
    .select('*')
    .eq('helper_id', helper.id);

  if (residentId) query = query.eq('resident_id', residentId);
  if (month) query = query.eq('month_year', month);

  const { data: reports } = await query.order('created_at', { ascending: false });
  return NextResponse.json(reports || []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { resident_id, month_year } = await request.json();

  if (!resident_id || !month_year) {
    return NextResponse.json({ error: 'resident_id und month_year erforderlich' }, { status: 400 });
  }

  // Helfer-Profil laden
  const { data: helper } = await supabase
    .from('neighborhood_helpers')
    .select('id, user_id, subscription_status, trial_receipt_used, federal_state, date_of_birth, hourly_rate_cents')
    .eq('user_id', user.id)
    .single();

  if (!helper) return NextResponse.json({ error: 'Kein Helfer-Profil' }, { status: 404 });
  if (!canAccessBilling(helper.subscription_status, helper.trial_receipt_used)) {
    return NextResponse.json({ error: 'Abrechnungs-Modul erforderlich' }, { status: 403 });
  }

  // Verbindung prüfen
  const { data: connection } = await supabase
    .from('helper_connections')
    .select('id')
    .eq('helper_id', helper.id)
    .eq('resident_id', resident_id)
    .not('confirmed_at', 'is', null)
    .is('revoked_at', null)
    .single();

  if (!connection) {
    return NextResponse.json({ error: 'Keine bestätigte Verbindung mit diesem Bewohner' }, { status: 403 });
  }

  // Sessions des Monats laden
  const [year, month] = month_year.split('-');
  const startDate = `${year}-${month}-01`;
  const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const endDate = `${year}-${month}-${endDay.toString().padStart(2, '0')}`;

  const { data: sessions } = await supabase
    .from('help_sessions')
    .select('*, help_matches!inner(helper_id, request_id, help_requests!inner(user_id))')
    .eq('help_matches.helper_id', helper.id)
    .eq('help_matches.help_requests.user_id', resident_id)
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .in('status', ['signed', 'receipt_created']);

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ error: 'Keine Einsätze in diesem Monat' }, { status: 404 });
  }

  // Senior-Profil laden
  const { data: careProfile } = await supabase
    .from('care_profiles_hilfe')
    .select('*')
    .eq('user_id', resident_id)
    .single();

  // Benutzer-Daten laden
  const { data: { user: seniorUser } } = await supabase.auth.admin.getUserById(resident_id);
  const { data: { user: helperUser } } = await supabase.auth.admin.getUserById(user.id);

  const totalAmountCents = sessions.reduce((sum, s) => sum + s.total_amount_cents, 0);

  // PDF generieren
  const pdf = generateMonthlyReport({
    helperName: helperUser?.user_metadata?.full_name || 'Helfer',
    helperAddress: helperUser?.user_metadata?.address || '',
    seniorName: seniorUser?.user_metadata?.full_name || 'Bewohner',
    seniorAddress: seniorUser?.user_metadata?.address || '',
    insuranceName: careProfile?.insurance_name || '',
    insuranceNumber: careProfile?.insurance_number_encrypted || '',
    careLevel: careProfile?.care_level || 1,
    monthYear: month_year,
    sessions: sessions.map((s) => ({
      date: s.session_date,
      startTime: s.start_time,
      endTime: s.end_time,
      durationMinutes: s.duration_minutes,
      category: s.activity_category,
      amountCents: s.total_amount_cents,
    })),
    totalAmountCents,
    hourlyRateCents: helper.hourly_rate_cents,
  });

  // PDF in Supabase Storage speichern
  const fileName = `monthly-reports/${helper.id}/${resident_id}/${month_year}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('hilfe')
    .upload(fileName, pdf, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error('[monthly-report] Upload fehlgeschlagen:', uploadError);
    return NextResponse.json({ error: 'PDF-Upload fehlgeschlagen' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('hilfe').getPublicUrl(fileName);

  // Report in DB speichern
  const { data: report, error: insertError } = await supabase
    .from('help_monthly_reports')
    .upsert({
      helper_id: helper.id,
      resident_id,
      month_year,
      pdf_url: urlData.publicUrl,
      total_sessions: sessions.length,
      total_amount_cents: totalAmountCents,
    }, { onConflict: 'helper_id,resident_id,month_year' })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(report, { status: 201 });
}
