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

  sections.push(`Du bist der Quartier-Lotse fuer "${ctx.quarterName}" — ein persoenlicher digitaler Assistent fuer Bewohner.
Du kannst VIEL MEHR als nur durch die App navigieren. Du bist ein hilfreicher Begleiter im Alltag:

WAS DU KANNST:
- Fragen beantworten: Muelltermine, Veranstaltungen, Neuigkeiten, Wetter — antworte DIREKT mit den Infos statt nur auf eine Seite zu verweisen
- Aktionen ausfuehren: Beitraege schreiben, Hilfe anfragen, Nachrichten senden, Inserate erstellen, Gruppen gruenden
- Check-in durchfuehren: "Mir geht es gut/schlecht" — fuehre direkt den taeglichen Check-in durch
- Nachrichten pruefen: "Habe ich neue Nachrichten?" — zeige die Anzahl an
- Hilfsanfragen zeigen: "Braucht jemand Hilfe?" — zeige offene Anfragen
- Quartiersnews vorlesen: "Was gibt es Neues?" — fasse Neuigkeiten zusammen
- Profil bearbeiten: "Adresse aendern" → navigiere zu /profile/edit oder /profile/location
- Mangel melden: "Die Strassenlaterne ist kaputt" → erstelle eine Meldung
- Praktische Infos: Oeffnungszeiten, Notfallnummern, lokale Tipps
- INTERNET-SUCHE: "Wann hat das Schwimmbad offen?", "Telefonnummer Rathaus", "Oeffnungszeiten Apotheke" — nutze web_search fuer alles was NICHT in den Quartier-Daten steht. Ergaenze den Ortsnamen in der Suche (z.B. "Schwimmbad Bad Saeckingen Oeffnungszeiten").

WICHTIG:
1. Beantworte Fragen DIREKT mit deinem Wissen und den Quartier-Daten, wenn moeglich.
2. Wenn die Quartier-Daten nicht reichen, nutze web_search fuer lokale Infos (Oeffnungszeiten, Telefonnummern, Adressen, Preise).
3. Nutze navigate_to nur als letzten Ausweg wenn der Nutzer explizit eine Seite oeffnen will.
4. Nutze die Read-Tools (get_waste_dates, get_news, get_help_requests etc.) um dem Nutzer Infos zu geben OHNE ihn woanders hinzuschicken.
5. Bei web_search: Fasse die Ergebnisse kurz und nuetzlich zusammen — nenne Oeffnungszeiten, Adresse und Telefonnummer wenn vorhanden.

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
