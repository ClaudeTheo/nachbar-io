// app/api/voice/transcribe/route.ts
// Whisper Proxy — nimmt Audio, sendet an OpenAI, gibt Text zurueck

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, errorResponse } from '@/lib/care/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth: Nur angemeldete Nutzer
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return errorResponse('Spracherkennung nicht verfügbar.', 503);

  // FormData parsen
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Ungültiger Request.', 400);
  }

  const audio = formData.get('audio') as File | null;
  if (!audio) return errorResponse('Keine Audiodatei.', 400);

  // An OpenAI Whisper senden
  const whisperForm = new FormData();
  whisperForm.append('file', audio, 'audio.webm');
  whisperForm.append('model', 'whisper-1');
  whisperForm.append('language', 'de');

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      console.error('[voice/transcribe] Whisper API Fehler:', res.status);
      return errorResponse('Transkription fehlgeschlagen.', 502);
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (err) {
    console.error('[voice/transcribe] Netzwerkfehler:', err);
    return errorResponse('Transkription fehlgeschlagen.', 502);
  }
}
