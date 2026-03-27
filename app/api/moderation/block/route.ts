import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { BlockLevel } from '@/lib/moderation/types';

const VALID_BLOCK_LEVELS: BlockLevel[] = ['mute', 'block', 'safety'];

// POST /api/moderation/block — Nutzer blockieren/stummschalten
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

  const { blockedId, blockLevel = 'block' } = body;

  if (!blockedId) {
    return NextResponse.json({ error: 'blockedId ist erforderlich' }, { status: 400 });
  }

  // Sich selbst blockieren verhindern
  if (blockedId === user.id) {
    return NextResponse.json({ error: 'Sie können sich nicht selbst blockieren' }, { status: 400 });
  }

  if (!VALID_BLOCK_LEVELS.includes(blockLevel)) {
    return NextResponse.json({ error: 'Ungültiges Block-Level' }, { status: 400 });
  }

  // Upsert: Block erstellen oder Block-Level aktualisieren
  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      {
        blocker_id: user.id,
        blocked_id: blockedId,
        block_level: blockLevel,
      },
      { onConflict: 'blocker_id,blocked_id' },
    );

  if (error) {
    console.error('[moderation] Block-Erstellung fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Block konnte nicht erstellt werden' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Nutzer blockiert' });
}

// DELETE /api/moderation/block — Block aufheben
export async function DELETE(request: NextRequest) {
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

  const { blockedId } = body;

  if (!blockedId) {
    return NextResponse.json({ error: 'blockedId ist erforderlich' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) {
    console.error('[moderation] Block-Aufhebung fehlgeschlagen:', error);
    return NextResponse.json({ error: 'Block konnte nicht aufgehoben werden' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Block aufgehoben' });
}
