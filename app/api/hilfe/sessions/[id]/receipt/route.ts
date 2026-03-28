// app/api/hilfe/sessions/[id]/receipt/route.ts
// Nachbar Hilfe — PDF-Quittung generieren (POST) und abrufen (GET)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReceipt, type ReceiptData } from '@/modules/hilfe/services/pdf-receipt';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/hilfe/sessions/[id]/receipt — PDF generieren und speichern
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { id: sessionId } = await context.params;

  // Session laden
  const { data: session, error: sessionError } = await supabase
    .from('help_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 });
  }

  // Prüfen ob bereits eine Quittung existiert
  if (session.status === 'receipt_created') {
    return NextResponse.json({ error: 'Quittung wurde bereits erstellt' }, { status: 409 });
  }

  // Session muss signiert sein
  if (session.status !== 'signed') {
    return NextResponse.json(
      { error: 'Session muss zuerst von beiden Parteien unterschrieben werden' },
      { status: 400 },
    );
  }

  // Request-Body mit Bewohner- und Helferdaten lesen
  let body: {
    resident: ReceiptData['resident'];
    helper: ReceiptData['helper'];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  if (!body.resident || !body.helper) {
    return NextResponse.json(
      { error: 'resident und helper Daten sind erforderlich' },
      { status: 400 },
    );
  }

  // PDF generieren
  const receiptData: ReceiptData = {
    resident: body.resident,
    helper: body.helper,
    session: {
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      activity_category: session.activity_category,
      activity_description: session.activity_description,
      hourly_rate_cents: session.hourly_rate_cents,
      total_amount_cents: session.total_amount_cents,
    },
    signatures: {
      helper: session.helper_signature_url ?? '',
      resident: session.resident_signature_url ?? '',
    },
  };

  const pdfBytes = generateReceipt(receiptData);

  // PDF in Supabase Storage hochladen
  const fileName = `receipt_${sessionId}_${Date.now()}.pdf`;
  const storagePath = `hilfe/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(storagePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    console.error('[hilfe/receipt] Upload fehlgeschlagen:', uploadError);
    return NextResponse.json({ error: 'PDF-Upload fehlgeschlagen' }, { status: 500 });
  }

  // Öffentliche URL holen
  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(storagePath);

  const pdfUrl = urlData.publicUrl;

  // help_receipts Eintrag erstellen
  const { data: receipt, error: receiptError } = await supabase
    .from('help_receipts')
    .insert({
      session_id: sessionId,
      pdf_url: pdfUrl,
      submitted_to_insurer: false,
    })
    .select()
    .single();

  if (receiptError || !receipt) {
    console.error('[hilfe/receipt] DB-Eintrag fehlgeschlagen:', receiptError);
    return NextResponse.json({ error: 'Quittung konnte nicht gespeichert werden' }, { status: 500 });
  }

  // Session-Status aktualisieren
  const { error: updateError } = await supabase
    .from('help_sessions')
    .update({ status: 'receipt_created' })
    .eq('id', sessionId);

  if (updateError) {
    console.error('[hilfe/receipt] Status-Update fehlgeschlagen:', updateError);
    // Quittung wurde erstellt, nur Status-Update schlug fehl — trotzdem 201 zurückgeben
  }

  return NextResponse.json({ pdf_url: pdfUrl, receipt_id: receipt.id }, { status: 201 });
}

// GET /api/hilfe/sessions/[id]/receipt — Quittungsinformationen abrufen
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { id: sessionId } = await context.params;

  const { data: receipt, error } = await supabase
    .from('help_receipts')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !receipt) {
    return NextResponse.json({ error: 'Keine Quittung für diese Session gefunden' }, { status: 404 });
  }

  return NextResponse.json(receipt);
}
