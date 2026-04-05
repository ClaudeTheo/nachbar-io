// Praevention — KI-Sitzungs-Service
// Generiert taegliche Begleitung via Claude Haiku mit Eskalationserkennung.
// Design-Ref: docs/plans/2026-04-05-praevention-ki-systembeschreibung.md

import Anthropic from "@anthropic-ai/sdk";

// Eskalations-Stufen
export type EscalationLevel = "green" | "yellow" | "red";

export interface KiSessionResponse {
  reply: string;
  escalationLevel: EscalationLevel;
  suggestedExercise: string | null;
  shouldEndSession: boolean;
}

export interface KiSessionRequest {
  userMessage: string;
  weekNumber: number;
  weekSystemPrompt: string | null;
  moodBefore: number | null;
  sessionHistory: { role: "user" | "assistant"; content: string }[];
}

// Signalwoerter fuer Eskalation (aus KI-Systembeschreibung)
const RED_SIGNALS = [
  "will nicht mehr leben",
  "keinen sinn",
  "moechte sterben",
  "möchte sterben",
  "ohne mich waere es besser",
  "ohne mich wäre es besser",
  "halte das nicht mehr aus",
  "keinen grund mehr weiterzumachen",
  "will sterben",
  "mich umbringen",
  "nicht mehr aufwachen",
  "alles beenden",
];

const YELLOW_SIGNALS = [
  "bringt alles nichts",
  "ganze woche schlecht",
  "schaffe das nicht",
  "fuehle mich so allein",
  "fühle mich so allein",
  "kann nicht schlafen",
  "alles ist so anstrengend",
  "hoffnungslos",
  "keine kraft",
  "will nicht mehr",
  "schaff das nicht",
  "bin so muede",
  "bin so müde",
  "alles zu viel",
];

// Eskalation anhand von Signalwoertern erkennen
export function detectEscalation(text: string): EscalationLevel {
  const lower = text.toLowerCase();
  for (const signal of RED_SIGNALS) {
    if (lower.includes(signal)) return "red";
  }
  for (const signal of YELLOW_SIGNALS) {
    if (lower.includes(signal)) return "yellow";
  }
  return "green";
}

// Notfall-Antwort (Rot — IMMER, OHNE AUSNAHME)
const RED_RESPONSE: KiSessionResponse = {
  reply: `Das klingt sehr belastend, und ich nehme das ernst.

Bitte rufen Sie jetzt den Notruf an: 112.
Oder den örtlichen Krisendienst in Ihrer Region.

Ergänzend können Sie die Telefonseelsorge erreichen:
0800 111 0 111 — kostenlos, rund um die Uhr.

Bitte sprechen Sie auch so schnell wie möglich mit Ihrer Kursleitung oder Ihrem Hausarzt.

Sie sind nicht allein.

Ich beende die heutige Übung hier. Bitte kümmern Sie sich jetzt um sich. Die oben genannten Nummern sind rund um die Uhr erreichbar.`,
  escalationLevel: "red",
  suggestedExercise: null,
  shouldEndSession: true,
};

// Basis-System-Prompt (immer aktiv)
const BASE_SYSTEM_PROMPT = `Du bist ein unterstützender digitaler Begleiter für die tägliche Selbstlernphase des Präventionskurses "Aktiv im Quartier".

WICHTIGE REGELN:
- Du bist NICHT die Kursleitung, kein Therapeut, kein Arzt, kein Seelsorger.
- Sieze immer ("Sie").
- Ruhig, sachlich, warmherzig. Einfache Sätze.
- Keine Diagnosen, keine Therapie, keine medizinischen Ratschläge.
- Keine Heilversprechen. Kein Druck. Keine Bewertung.
- Keine persönlichen Meinungen.
- Bei Fragen außerhalb des Übungsrahmens: Verweis an Kursleitung.
- Du speicherst keine Gesprächsinhalte und greifst nicht auf frühere persönliche Äußerungen zurück.

ÜBUNGEN DIE DU ANLEITEN KANNST:
- Progressive Muskelrelaxation (PMR) — Kurz- und Langform
- Achtsames Atmen (4-7-8 Rhythmus, einfaches Beobachten)
- Body Scan
- Metta-Meditation (ab Woche 5)
- Dankbarkeitsübung (ab Woche 3)

ESKALATION:
- Bei starker Belastung: Validieren, vereinfachen, Kursleitung empfehlen.
- Bei Suizidgedanken: SOFORT Notruf 112 + Telefonseelsorge 0800 111 0 111 nennen. Übung beenden.`;

// Wochen-spezifische Ergaenzungen
function getWeekContext(weekNumber: number): string {
  switch (weekNumber) {
    case 1:
    case 2:
      return `WOCHE ${weekNumber} (Grundlagen):
- Body Scan und PMR Langform anleiten
- Jeden Schritt ausführlich erklären
- Tempo: Sehr langsam, lange Pausen
- Besonders geduldig bei Fragen
- Ermutigen: "Es ist Ihr erster Versuch, und das machen Sie gut."`;
    case 3:
    case 4:
      return `WOCHE ${weekNumber} (Vertiefung):
- PMR Kurzform anleiten
- Achtsamkeitsübungen (achtsames Atmen, Body Scan)
- Dankbarkeitsfrage: "Für welche drei Dinge sind Sie heute dankbar?"
- Wahlfreiheit: "Möchten Sie heute PMR oder Achtsamkeit?"`;
    case 5:
    case 6:
      return `WOCHE ${weekNumber} (Soziale Aktivierung):
- Metta-Meditation anleiten
- Sanfte soziale Reflexion: "Gab es diese Woche einen kleinen Moment von Kontakt?"
- KEINE Fragen, die Einsamkeit verstärken oder Druck erzeugen
- NICHT: "Haben Sie schon mit jemandem gesprochen?"
- STATTDESSEN: Offene, sanfte Formulierungen ohne implizite Erwartung`;
    case 7:
    case 8:
      return `WOCHE ${weekNumber} (Nachhaltigkeit):
- Wahlfreiheit: "Welche Methode möchten Sie heute üben?"
- Optionen: PMR, Achtsamkeit, Metta, Dankbarkeit
- Reflexion: "Was möchten Sie nach dem Kurs beibehalten?"
${weekNumber === 8 ? '- Letzte Sitzung: "Herzlichen Glückwunsch zum Kursabschluss! Sie haben 8 Wochen durchgehalten."' : ""}`;
    default:
      return "";
  }
}

// Stimmungs-Kontext
function getMoodContext(moodBefore: number | null): string {
  if (moodBefore === null) return "";
  switch (moodBefore) {
    case 1:
      return "Der Teilnehmende hat angegeben, dass es ihm/ihr gut geht (Sonne-Symbol). Beginne positiv und ermutigend.";
    case 2:
      return "Der Teilnehmende hat angegeben, dass es so geht (Wolke-Symbol). Beginne verständnisvoll, biete einfache Übung an.";
    case 3:
      return "Der Teilnehmende hat angegeben, dass es ihm/ihr schlecht geht (Regen-Symbol). Sei besonders einfühlsam, biete eine ganz einfache Atemübung an, KEINEN Druck.";
    default:
      return "";
  }
}

// KI-Antwort generieren
export async function generateSessionResponse(
  request: KiSessionRequest,
): Promise<KiSessionResponse> {
  // Signalwort-Erkennung ZUERST (vor KI-Aufruf)
  const escalation = detectEscalation(request.userMessage);
  if (escalation === "red") {
    return RED_RESPONSE;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY nicht konfiguriert");
  }

  // System-Prompt zusammenbauen
  const weekContext = getWeekContext(request.weekNumber);
  const moodContext = getMoodContext(request.moodBefore);
  const customPrompt = request.weekSystemPrompt
    ? `\nKURSLEITUNG-ANWEISUNGEN:\n${request.weekSystemPrompt}`
    : "";

  const systemPrompt = [
    BASE_SYSTEM_PROMPT,
    weekContext,
    moodContext,
    customPrompt,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Nachrichten-Verlauf (max 10 Paare)
  const messages = request.sessionHistory.slice(-20).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Aktuelle Nachricht anhaengen
  messages.push({ role: "user", content: request.userMessage });

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });

  const reply =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Uebung vorschlagen basierend auf Woche
  let suggestedExercise: string | null = null;
  if (request.weekNumber <= 2) suggestedExercise = "pmr_langform";
  else if (request.weekNumber <= 4) suggestedExercise = "achtsamkeit_atmen";
  else if (request.weekNumber <= 6) suggestedExercise = "metta_meditation";
  else suggestedExercise = "wahlfreiheit";

  return {
    reply,
    escalationLevel: escalation, // green oder yellow
    suggestedExercise,
    shouldEndSession: false,
  };
}
