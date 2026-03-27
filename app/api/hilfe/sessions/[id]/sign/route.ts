// app/api/hilfe/sessions/[id]/sign/route.ts
// Nachbar Hilfe — Unterschrift hochladen (Helfer oder Bewohner)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/hilfe/sessions/[id]/sign — Unterschrift speichern
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

  const { id: sessionId } = await context.params;

  let body: {
    role?: string;
    signature_data_url?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges Anfrage-Format' }, { status: 400 });
  }

  const { role, signature_data_url } = body;

  // Rolle validieren
  if (!role || (role !== 'helper' && role !== 'resident')) {
    return NextResponse.json({ error: 'role muss "helper" oder "resident" sein' }, { status: 400 });
  }

  if (!signature_data_url) {
    return NextResponse.json({ error: 'signature_data_url ist erforderlich' }, { status: 400 });
  }

  // Session laden um aktuellen Stand der Unterschriften zu pruefen
  const { data: existingSession, error: fetchError } = await supabase
    .from('help_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError || !existingSession) {
    return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 });
  }

  // Signatur-Feld bestimmen
  const signatureField = role === 'helper' ? 'helper_signature_url' : 'resident_signature_url';
  const otherField = role === 'helper' ? 'resident_signature_url' : 'helper_signature_url';

  // Pruefen ob nach dem Update beide Signaturen vorhanden sind
  const bothSigned = existingSession[otherField] !== null;
  const updatePayload: Record<string, unknown> = {
    [signatureField]: signature_data_url,
  };

  // Wenn beide Signaturen vorhanden → Status auf 'signed' setzen
  if (bothSigned) {
    updatePayload.status = 'signed';
  }

  const { data: updated, error: updateError } = await supabase
    .from('help_sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('[hilfe/sessions/sign] Update fehlgeschlagen:', updateError);
    return NextResponse.json({ error: 'Signatur konnte nicht gespeichert werden' }, { status: 500 });
  }

  return NextResponse.json(updated);
}
