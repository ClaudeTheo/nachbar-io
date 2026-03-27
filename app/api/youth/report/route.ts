// app/api/youth/report/route.ts
// Jugend-Modul: Melde-System — Inhalte melden, Auto-Sperre nach 3 Meldungen
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_TARGET_TYPES = ['task', 'message', 'post', 'user'] as const;
const AUTO_SUSPEND_THRESHOLD = 3;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  let body: { target_type?: string; target_id?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const { target_type, target_id, reason } = body;

  if (!target_type || !target_id || !reason) {
    return NextResponse.json({ error: 'target_type, target_id und reason erforderlich' }, { status: 400 });
  }

  if (!VALID_TARGET_TYPES.includes(target_type as typeof VALID_TARGET_TYPES[number])) {
    return NextResponse.json({ error: 'Ungültiger target_type' }, { status: 400 });
  }

  // Meldung in Moderation-Log schreiben
  const { error: insertError } = await supabase
    .from('youth_moderation_log')
    .insert({
      target_type,
      target_id,
      action: 'flagged',
      reason,
      moderator_id: user.id,
    });

  if (insertError) {
    return NextResponse.json({ error: 'Meldung konnte nicht gespeichert werden' }, { status: 500 });
  }

  // Auto-Sperre prüfen: 3 Meldungen gegen dasselbe Ziel → suspended
  const { count } = await supabase
    .from('youth_moderation_log')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .eq('action', 'flagged');

  let autoSuspended = false;
  if (count && count >= AUTO_SUSPEND_THRESHOLD) {
    await supabase
      .from('youth_moderation_log')
      .insert({
        target_type,
        target_id,
        action: 'suspended',
        reason: `Automatische Sperre nach ${count} Meldungen`,
        moderator_id: user.id,
      });
    autoSuspended = true;
  }

  return NextResponse.json({
    reported: true,
    auto_suspended: autoSuspended,
  }, { status: 201 });
}
