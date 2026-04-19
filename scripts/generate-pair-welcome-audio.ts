// scripts/generate-pair-welcome-audio.ts
// Einmaliges Script: erzeugt public/audio/pair-welcome.mp3 via OpenAI TTS.
// Ausfuehrung: `npx tsx scripts/generate-pair-welcome-audio.ts`
// Ergebnis wird committed; Script bleibt im Repo fuer reproduzierbare Regeneration.
//
// Nutzt direktes fetch gegen OpenAI (wie tts.service.ts), kein SDK-Dependency.

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { SENIOR_VOICE_INSTRUCTIONS } from "../modules/voice/services/tts.service";

const TEXT =
  "Bitte bitten Sie einen Angehörigen, diesen Code mit dem Handy abzufotografieren. " +
  "Oder tippen Sie unten auf 'Ich habe einen Code'.";

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY fehlt in env");
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      input: TEXT,
      voice: "ash",
      speed: 0.95,
      instructions: SENIOR_VOICE_INSTRUCTIONS,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI TTS fehlgeschlagen: ${res.status} ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const target = resolve(process.cwd(), "public/audio/pair-welcome.mp3");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  console.log(`Geschrieben: ${target} (${buffer.length} Bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
