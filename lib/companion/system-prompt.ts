// Nachbar.io — Companion System-Prompt Builder
// Baut den Claude-System-Prompt mit Quartier-Kontext auf

/** Quartier-Kontext fuer den Companion */
export interface QuarterContext {
  quarterName: string;
  wasteDate: { date: string; type: string }[];
  events: { title: string; date: string }[];
  bulletinPosts: { title: string; category: string }[];
  meals?: { title: string; type: string; servings: number; meal_date: string }[];
}

/**
 * Formatiert ein ISO-Datum (YYYY-MM-DD) als DD.MM.YYYY.
 */
function formatDateDE(isoDate: string): string {
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** Optionen fuer den System-Prompt */
export interface PromptOptions {
  formality?: 'formal' | 'informal'
}

/**
 * Baut den System-Prompt fuer den Quartier-Lotsen.
 * Enthaelt Persoenlichkeit, Regeln und aktuellen Quartier-Kontext.
 */
export function buildSystemPrompt(ctx: QuarterContext, options?: PromptOptions): string {
  const formality = options?.formality ?? 'formal'
  const sections: string[] = [];

  // Persoenlichkeit + Rolle (abhaengig von Foermlichkeit)
  const formalityInstruction = formality === 'informal'
    ? 'Duze den Nutzer, sei freundlich und locker. Verwende "du/dein/dir".'
    : 'Sieze die Bewohner immer. Verwende "Sie/Ihnen/Ihr".';

  sections.push(`Du bist der Quartier-Lotse fuer "${ctx.quarterName}".
Du hilfst Bewohnern bei Fragen rund um ihr Quartier: Muelltermine, Veranstaltungen, Schwarzes Brett, Nachbarschaftshilfe und lokale Informationen.
Dein Ton ist sachlich-hilfsbereit, ruhig und freundlich. ${formalityInstruction}`);

  // Regeln
  const addressRule = formality === 'informal'
    ? '- Duze den Nutzer (du/dein/dir).'
    : '- Sieze die Bewohner immer (Sie/Ihnen/Ihr).';

  sections.push(`REGELN:
${addressRule}
- Bei Notfaellen verweise SOFORT auf 112 (Feuer/Rettung) oder 110 (Polizei), bevor Du etwas anderes sagst.
- Gib KEINE medizinische Beratung. Verweise auf aerztliche Hilfe.
- Beantworte nur Fragen, die das Quartier betreffen. Bei anderen Themen leite hoeflich ab.
- Halte Antworten kurz und praegnant (max 3-4 Saetze, wenn moeglich).
- Wenn Du etwas nicht weisst, sage es ehrlich.`);

  // Quartier-Kontext
  const contextParts: string[] = [];

  // Muelltermine
  if (ctx.wasteDate.length > 0) {
    const wasteLines = ctx.wasteDate
      .map(w => `- ${formatDateDE(w.date)}: ${w.type}`)
      .join('\n');
    contextParts.push(`Naechste Muelltermine:\n${wasteLines}`);
  }

  // Veranstaltungen
  if (ctx.events.length > 0) {
    const eventLines = ctx.events
      .map(e => `- ${formatDateDE(e.date)}: ${e.title}`)
      .join('\n');
    contextParts.push(`Naechste Veranstaltungen:\n${eventLines}`);
  }

  // Schwarzes Brett
  if (ctx.bulletinPosts.length > 0) {
    const postLines = ctx.bulletinPosts
      .map(p => `- [${p.category}] ${p.title}`)
      .join('\n');
    contextParts.push(`Aktuelle Beitraege (Schwarzes Brett):\n${postLines}`);
  }

  // Mitess-Plaetze
  if (ctx.meals && ctx.meals.length > 0) {
    const mealLines = ctx.meals
      .map(m => `- ${m.title} (${m.type}, ${m.servings} verfügbar) — ${formatDateDE(m.meal_date)}`)
      .join('\n');
    contextParts.push(`Aktuelle Mitess-Angebote:\n${mealLines}`);
  }

  if (contextParts.length > 0) {
    sections.push(`AKTUELLER QUARTIER-KONTEXT:\n${contextParts.join('\n\n')}`);
  } else {
    sections.push('AKTUELLER QUARTIER-KONTEXT:\nKeine aktuellen Infos verfuegbar.');
  }

  return sections.join('\n\n');
}
