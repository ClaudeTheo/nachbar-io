// KI-Klassifizierung fuer den Sprach-Assistenten
// Analysiert Spracheingaben via Claude Haiku und ordnet sie einer von 6 Aktionen zu

import Anthropic from '@anthropic-ai/sdk';

/** Moegliche Aktionen des Assistenten */
export type AssistantAction =
  | 'help_request'
  | 'report_issue'
  | 'emergency_info'
  | 'navigate'
  | 'find_neighbor'
  | 'set_help_offers'
  | 'general';

/** Ergebnis der Assistenten-Klassifizierung */
export interface AssistantResult {
  action: AssistantAction;
  params: Record<string, string>;
  message: string;
  spokenResponse: string; // Freundlicher Text fuer TTS-Ausgabe (Siez-Form)
}

/** Alle gueltigen Aktionen fuer Validierung */
const VALID_ACTIONS: AssistantAction[] = [
  'help_request',
  'report_issue',
  'emergency_info',
  'navigate',
  'find_neighbor',
  'set_help_offers',
  'general',
];

/** Erlaubte Routen fuer navigate-Aktion */
const ALLOWED_ROUTES = [
  '/dashboard',
  '/waste-calendar',
  '/map',
  '/profile',
  '/inbox',
  '/care/tasks',
  '/care',
  '/city-services',
  '/marketplace',
  '/notifications',
] as const;

/** System-Prompt fuer die Assistenten-Klassifizierung */
const ASSISTANT_SYSTEM_PROMPT = `Du bist ein Sprach-Assistent für eine Senioren-Quartier-App namens QuartierApp. Analysiere die Spracheingabe und bestimme die passende Aktion.

Aktionen:
- help_request — Bewohner braucht Hilfe (Einkauf, Fahrt, Garten, Technik, etc.). Params: category, title, description
- report_issue — Mängelmelder (kaputte Laterne, Schlagloch, etc.). Params: category
- emergency_info — Notfall (Feuer, Unfall, Einbruch, medizinischer Notfall). Params: number (112 oder 110)
- navigate — Navigation zu einer App-Seite. Params: route (z.B. /dashboard, /waste-calendar, /map, /profile, /inbox, /care/tasks, /care, /city-services, /marketplace, /notifications)
- find_neighbor — Suche nach Nachbarn oder Kontakten. Params: query
- set_help_offers — Bewohner sagt, was er/sie anbieten kann (z.B. "Ich kann beim Einkaufen helfen und Hunde ausführen"). Params: skills (Array von Kategorie-IDs: medical, legal, electrical, it, garden, handwork, transport, cooking, music, languages, childcare, pet_care). Erkenne die passenden Kategorien aus der Spracheingabe.
- general — Allgemeine Frage oder Konversation. Params: leer

WICHTIG: Bei Notfall-Schlüsselwörtern (Feuer, Brand, Unfall, Herzinfarkt, Einbruch, Überfall, Hilfe Notfall, Krankenwagen, Polizei) IMMER emergency_info verwenden.

Antworte NUR als JSON-Objekt mit den Feldern: action, params, message, spokenResponse
Das Feld "spokenResponse" ist ein freundlicher, gesprochener Satz fuer die Sprachausgabe (Siez-Form, max 3 Saetze, z.B. "Ich öffne den Müllkalender für Sie.").
Bei Notfall: "Bitte rufen Sie sofort die 112 an!"
Kein Markdown, keine Erklaerungen — nur JSON.`;

/**
 * Parst die KI-Antwort und validiert Aktion + Parameter.
 * Bei ungueltigem JSON oder ungueltiger Aktion: Fallback auf general.
 */
export function parseAssistantResponse(
  responseText: string,
  originalText: string
): AssistantResult {
  let jsonStr = responseText.trim();

  // Markdown-Wrapper entfernen falls vorhanden
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const action = typeof parsed.action === 'string' ? parsed.action.trim() : 'general';
    const params =
      typeof parsed.params === 'object' && parsed.params !== null
        ? (parsed.params as Record<string, string>)
        : {};
    const message = typeof parsed.message === 'string' ? parsed.message : originalText;
    const spokenResponse = typeof parsed.spokenResponse === 'string'
      ? parsed.spokenResponse
      : message; // Fallback: message als gesprochene Antwort

    // Aktion validieren
    if (!VALID_ACTIONS.includes(action as AssistantAction)) {
      return fallbackResult(originalText);
    }

    // Bei navigate: Route gegen erlaubte Routen pruefen
    if (action === 'navigate') {
      const route = typeof params.route === 'string' ? params.route : '';
      if (!ALLOWED_ROUTES.includes(route as (typeof ALLOWED_ROUTES)[number])) {
        return fallbackResult(originalText);
      }
    }

    return {
      action: action as AssistantAction,
      params,
      message,
      spokenResponse,
    };
  } catch {
    return fallbackResult(originalText);
  }
}

/**
 * Klassifiziert eine Spracheingabe ueber Claude Haiku.
 * Fallback bei Fehler oder fehlendem API-Key: general + Rohtext.
 */
/** Optionaler Kontext der vorherigen Aktion (fuer "Nochmal sprechen") */
export interface PreviousAction {
  action: string;
  transcript: string;
}

export async function classifyAssistantAction(
  text: string,
  previousAction?: PreviousAction
): Promise<AssistantResult> {
  // Leerer Text → Fallback
  if (!text.trim()) {
    return { action: 'general', params: {}, message: '', spokenResponse: '' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackResult(text);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: ASSISTANT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: previousAction
            ? `Vorherige Anfrage des Nutzers: "${previousAction.transcript}" → Aktion: ${previousAction.action}\nDer Nutzer korrigiert oder stellt eine neue Anfrage.\n\nKlassifiziere diese Spracheingabe:\n\n"${text}"`
            : `Klassifiziere diese Spracheingabe:\n\n"${text}"`,
        },
      ],
    });

    // Antwort-Text extrahieren
    const block = response.content[0];
    if (block.type !== 'text') {
      return fallbackResult(text);
    }

    return parseAssistantResponse(block.text, text);
  } catch (err) {
    console.error('[assistant-classify] Fehler bei KI-Klassifizierung:', err);
    return fallbackResult(text);
  }
}

/** Fallback: Aktion general mit Rohtext als Nachricht */
function fallbackResult(text: string): AssistantResult {
  return {
    action: 'general',
    params: {},
    message: text,
    spokenResponse: text,
  };
}
