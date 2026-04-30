import { NextResponse } from "next/server";
import { EdgeTTS } from "edge-tts-universal";

// Microsoft Edge TTS — kostenlos, kein API-Key, natürliche Neural-Stimmen
// Deutsche Stimmen: de-DE-KatjaNeural (weiblich), de-DE-ConradNeural (männlich)
const VOICE = process.env.EDGE_TTS_VOICE || "de-DE-KatjaNeural";

// Maximale Textlänge (Schutz vor Missbrauch)
const MAX_TEXT_LENGTH = 500;

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text: string };

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Kein Text angegeben" },
        { status: 400 },
      );
    }

    // Text kürzen
    const trimmedText = text.slice(0, MAX_TEXT_LENGTH);

    // EdgeTTS: Konstruktor bekommt Text, Stimme und Optionen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tts = new (EdgeTTS as any)(trimmedText, VOICE, {
      rate: "-2%", // Leicht unter Normaltempo, natuerlich
      pitch: "+0Hz",
    });

    const result = await tts.synthesize();
    const arrayBuffer = await result.audio.arrayBuffer();

    // Raw Audio als Binary zurückgeben (kein Base64-JSON)
    // → Client kann direkt Blob erstellen, zuverlässigere Wiedergabe
    return new Response(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[TTS] Edge-TTS Fehler:", error);
    return NextResponse.json(
      { error: "Sprachausgabe nicht verfügbar" },
      { status: 500 },
    );
  }
}

// GET: Verfügbare deutsche Stimmen anzeigen
export async function GET() {
  return NextResponse.json({
    provider: "Microsoft Edge TTS (kostenlos, kein API-Key)",
    currentVoice: VOICE,
    cost: "$0.00/Monat",
    availableGerman: [
      {
        name: "de-DE-KatjaNeural",
        gender: "weiblich",
        description: "Freundlich, klar",
      },
      {
        name: "de-DE-ConradNeural",
        gender: "männlich",
        description: "Ruhig, sachlich",
      },
      {
        name: "de-DE-AmalaNeural",
        gender: "weiblich",
        description: "Warm, natürlich",
      },
      {
        name: "de-DE-LouisaNeural",
        gender: "weiblich",
        description: "Sanft, warmherzig",
      },
      {
        name: "de-DE-TanjaNeural",
        gender: "weiblich",
        description: "Lebhaft, ausdrucksvoll",
      },
      {
        name: "de-DE-RalfNeural",
        gender: "männlich",
        description: "Alltäglich, natürlich",
      },
    ],
    hint: "Stimme wechseln: EDGE_TTS_VOICE=de-DE-ConradNeural in .env.local",
  });
}
