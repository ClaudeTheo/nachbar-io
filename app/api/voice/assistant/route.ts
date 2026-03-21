// app/api/voice/assistant/route.ts
// Nachbar.io — KI-Sprach-Assistent: Klassifiziert Spracheingaben in Aktionen

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, errorResponse } from '@/lib/care/api-helpers';
import { classifyAssistantAction } from '@/lib/voice/assistant-classify';

export const dynamic = 'force-dynamic';

// POST /api/voice/assistant — Spracheingabe per KI klassifizieren
export async function POST(request: NextRequest) {
  // Auth: Nur angemeldete Nutzer duerfen den Assistenten nutzen
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Body parsen
  let body: { text?: unknown; previousAction?: unknown };
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

  // Optionaler Kontext der vorherigen Aktion
  let previousAction: { action: string; transcript: string } | undefined;
  if (body.previousAction && typeof body.previousAction === 'object') {
    const pa = body.previousAction as Record<string, unknown>;
    if (typeof pa.action === 'string' && typeof pa.transcript === 'string') {
      previousAction = { action: pa.action, transcript: pa.transcript };
    }
  }

  try {
    const result = await classifyAssistantAction(text, previousAction);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[voice/assistant] Unerwarteter Fehler:', err);
    // Fallback: Allgemeine Aktion mit Rohtext
    return NextResponse.json({
      action: 'general',
      params: {},
      message: text.slice(0, 200),
    });
  }
}
