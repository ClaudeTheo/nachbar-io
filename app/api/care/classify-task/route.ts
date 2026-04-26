// app/api/care/classify-task/route.ts
// Nachbar.io — KI-Klassifizierung von Spracheingaben für Hilfe-Aufgaben

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, errorResponse } from '@/lib/care/api-helpers';
import { classifyTaskFromVoice } from '@/lib/care/voice-classify';
import { AI_HELP_DISABLED_MESSAGE, canUsePersonalAi } from '@/lib/ai/user-settings';

export const dynamic = 'force-dynamic';

// POST /api/care/classify-task — Text per KI klassifizieren
export async function POST(request: NextRequest) {
  // Auth: Nur angemeldete Nutzer dürfen die KI nutzen
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const aiAllowed = await canUsePersonalAi(auth.supabase, auth.user.id);
  if (!aiAllowed) {
    return errorResponse(AI_HELP_DISABLED_MESSAGE, 503);
  }

  // Body parsen
  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungültiger Request-Body.', 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!text) {
    return errorResponse('Kein Text zum Klassifizieren angegeben.', 400);
  }

  if (text.length > 2000) {
    return errorResponse('Text ist zu lang (max. 2000 Zeichen).', 400);
  }

  try {
    const result = await classifyTaskFromVoice(text);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[classify-task] Unerwarteter Fehler:', err);
    // Fallback: Rohtext als Titel
    return NextResponse.json({
      category: 'other',
      title: text.slice(0, 80),
      description: '',
    });
  }
}
