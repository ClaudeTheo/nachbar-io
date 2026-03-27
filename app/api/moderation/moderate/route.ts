import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateContent } from '@/lib/moderation/service';
import type { ModerationChannel } from '@/lib/moderation/types';

const VALID_CHANNELS: ModerationChannel[] = ['board', 'marketplace', 'chat', 'comment', 'profile'];

// POST /api/moderation/moderate — Inhalt per KI moderieren
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges Anfrage-Format' }, { status: 400 });
  }

  const { text, channel, contentId, contentType } = body;

  // Pflichtfelder validieren
  if (!text || !channel) {
    return NextResponse.json(
      { error: 'text und channel sind erforderlich' },
      { status: 400 },
    );
  }

  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: 'Ungültiger Kanal' }, { status: 400 });
  }

  // KI-Moderation ausführen
  const result = await moderateContent({
    text,
    channel,
    authorId: user.id,
    contentId: contentId || '',
    contentType: contentType || channel,
  });

  // Bei Auffälligkeiten und vorhandenem contentId → in Moderation-Queue einfügen
  if (result.score !== 'green' && contentId) {
    const { error: queueError } = await supabase.from('moderation_queue').insert({
      content_type: contentType || channel,
      content_id: contentId,
      ai_score: result.score,
      ai_reason: result.reason,
      ai_confidence: result.confidence,
      flagged_categories: result.flaggedCategories,
      status: 'pending',
    });

    if (queueError) {
      console.error('[moderation] Queue-Eintrag fehlgeschlagen:', queueError);
      // Fehler beim Queue-Eintrag blockiert nicht die Antwort
    }
  }

  return NextResponse.json({
    score: result.score,
    reason: result.reason,
    confidence: result.confidence,
    flaggedCategories: result.flaggedCategories,
  });
}
