// app/api/voice/tts/route.ts
// OpenAI TTS Proxy — Text-to-Speech mit gpt-4o-mini-tts
// Unterstuetzt voice + speed aus Request-Body (Client sendet User-Preferences)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, errorResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth: Nur angemeldete Nutzer
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return errorResponse('Sprachausgabe nicht verfügbar.', 503);

  // Body parsen
  let body: { text?: unknown; voice?: unknown; speed?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungültiger Request.', 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return errorResponse('Kein Text angegeben.', 400);
  if (text.length > 1000) return errorResponse('Text zu lang (max. 1000 Zeichen).', 400);

  // Voice + Speed aus Body (Client sendet die gespeicherten Preferences)
  const voice = typeof body.voice === 'string' ? body.voice : 'nova';
  const speed = typeof body.speed === 'number' && body.speed >= 0.25 && body.speed <= 4.0
    ? body.speed
    : 1.0;

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!res.ok) {
      console.error('[voice/tts] OpenAI TTS Fehler:', res.status);
      return errorResponse('Sprachausgabe fehlgeschlagen.', 502);
    }

    // Audio-Stream durchleiten
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[voice/tts] Netzwerkfehler:', err);
    return errorResponse('Sprachausgabe fehlgeschlagen.', 502);
  }
}
