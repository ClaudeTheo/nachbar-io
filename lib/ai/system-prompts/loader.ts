// lib/ai/system-prompts/loader.ts
// Lazy-Cached-Loader fuer das Senior-App-Wissensdokument.
//
// Das Wissensdokument (senior-app-knowledge.md, ~4014 Woerter, C3) wird pro
// Prozess genau einmal von Disk gelesen. Kombiniert mit system_cached=true
// (C5a) sorgt das dafuer, dass Claude den System-Prompt nur alle 5 Minuten
// neu tokenisiert - sonst: 90 Prozent guenstigere Input-Kosten pro Turn.
//
// Fehler werden NICHT gecached: transiente IO-Fehler sollen beim naechsten
// Turn nicht dauerhaft bleiben.

import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: string | null = null;

export async function loadSeniorAppKnowledge(): Promise<string> {
  if (cached !== null) {
    return cached;
  }
  const filePath = path.join(__dirname, "senior-app-knowledge.md");
  const content = await readFile(filePath, "utf-8");
  cached = content;
  return content;
}

/** Nur fuer Tests: Cache zuruecksetzen. */
export function __resetSeniorAppKnowledgeCache(): void {
  cached = null;
}
