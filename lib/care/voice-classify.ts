// Sprach-Klassifizierung: Analysiert Text via Claude Haiku
// und bestimmt Kategorie, Titel und Beschreibung fuer eine Hilfe-Anfrage

import Anthropic from '@anthropic-ai/sdk';
import type { TaskCategory } from '@/components/care/TaskCard';

/** Ergebnis der KI-Klassifizierung */
export interface ClassifyResult {
  category: TaskCategory;
  title: string;
  description: string;
}

/** Gueltige Kategorien fuer Validierung */
const VALID_CATEGORIES: TaskCategory[] = [
  'transport', 'shopping', 'companionship', 'garden',
  'tech_help', 'pet_care', 'household', 'other',
];

/** System-Prompt fuer die Aufgaben-Klassifizierung */
const CLASSIFY_SYSTEM_PROMPT = `Du bist ein Assistent für eine Quartier-App. Analysiere den folgenden Text und bestimme die passende Kategorie für eine Hilfe-Anfrage.

Kategorien:
- transport — Fahrdienst, Arzttermin-Fahrten, Abholung
- shopping — Einkauf, Besorgungen, Lieferungen
- companionship — Gesellschaft, Spaziergang, Besuch
- garden — Gartenarbeit, Rasen mähen, Pflanzen
- tech_help — Technik, Computer, WLAN, Handy
- pet_care — Tierpflege, Gassi gehen, Füttern
- household — Haushalt, Reparaturen, Glühbirne, Paket
- other — Alles was nicht in die obigen Kategorien passt

Gib zurück:
- category: Eine der obigen Kategorien (nur den englischen Schlüssel)
- title: Ein kurzer, klarer Titel auf Deutsch (max 80 Zeichen)
- description: Eine Beschreibung der Anfrage auf Deutsch (max 200 Zeichen)

Antworte NUR als JSON-Objekt, ohne Markdown, ohne Erklärungen.`;

/**
 * Klassifiziert einen gesprochenen Text in eine Aufgaben-Kategorie.
 * Nutzt Claude Haiku fuer die Analyse.
 * Fallback bei Fehler: Kategorie 'other' + Rohtext als Titel.
 */
export async function classifyTaskFromVoice(text: string): Promise<ClassifyResult> {
  // Leerer Text → Fallback
  if (!text.trim()) {
    return {
      category: 'other',
      title: '',
      description: '',
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Ohne API-Key: Fallback mit Rohtext
    return fallbackResult(text);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Klassifiziere diese Spracheingabe:\n\n"${text}"`,
        },
      ],
    });

    // Antwort-Text extrahieren
    const block = response.content[0];
    if (block.type !== 'text') {
      return fallbackResult(text);
    }

    return parseClassifyResponse(block.text, text);
  } catch (err) {
    console.error('[voice-classify] Fehler bei KI-Klassifizierung:', err);
    return fallbackResult(text);
  }
}

/**
 * Parst die KI-Antwort und validiert die Felder.
 * Bei ungueltigem JSON oder fehlenden Feldern: Fallback.
 */
export function parseClassifyResponse(responseText: string, originalText: string): ClassifyResult {
  let jsonStr = responseText.trim();
  // Markdown-Wrapper entfernen falls vorhanden
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const category = typeof parsed.category === 'string' ? parsed.category.trim() : 'other';
    const title = typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 80) : originalText.slice(0, 80);
    const description = typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 200) : '';

    return {
      category: VALID_CATEGORIES.includes(category as TaskCategory)
        ? (category as TaskCategory)
        : 'other',
      title,
      description,
    };
  } catch {
    return fallbackResult(originalText);
  }
}

/** Fallback: Rohtext als Titel, Kategorie 'other' */
function fallbackResult(text: string): ClassifyResult {
  return {
    category: 'other',
    title: text.trim().slice(0, 80),
    description: '',
  };
}
