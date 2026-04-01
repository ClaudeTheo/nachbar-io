// modules/care/components/navigator/nba-questions.ts
// 64 NBA-Fragen fuer den Pflegegrad-Navigator
// Vereinfachte deutsche Sprache, leicht verstaendlich

import type { ModuleNumber } from "../../lib/nba-scoring";

export interface NbaScaleOption {
  value: number;
  label: string;
}

export interface NbaQuestion {
  id: string;
  module: ModuleNumber;
  label: string;
  description: string;
  scale: NbaScaleOption[];
}

// --- Skalen ---

// Module 1, 4, 6: Selbstaendigkeitsskala
const INDEPENDENCE_SCALE: NbaScaleOption[] = [
  { value: 0, label: "Selbständig" },
  { value: 1, label: "Überwiegend selbständig" },
  { value: 2, label: "Überwiegend unselbständig" },
  { value: 3, label: "Unselbständig" },
];

// Modul 2: Faehigkeitsskala
const ABILITY_SCALE: NbaScaleOption[] = [
  { value: 0, label: "Fähigkeit vorhanden" },
  { value: 1, label: "Größtenteils vorhanden" },
  { value: 2, label: "In geringem Maße vorhanden" },
  { value: 3, label: "Fähigkeit nicht vorhanden" },
];

// Modul 3: Haeufigkeitsskala
const FREQUENCY_SCALE: NbaScaleOption[] = [
  { value: 0, label: "Nie oder sehr selten" },
  { value: 1, label: "Selten (1-3x im Monat)" },
  { value: 2, label: "Häufig (2x+ pro Woche)" },
  { value: 3, label: "Täglich" },
];

// Modul 5: Versorgungsskala
const CARE_NEED_SCALE: NbaScaleOption[] = [
  { value: 0, label: "Entfällt / nicht nötig" },
  { value: 1, label: "Selbständig" },
  { value: 2, label: "Teilweise unselbständig" },
  { value: 3, label: "Unselbständig" },
];

// --- Moduldefinitionen ---

export interface ModuleDefinition {
  module: ModuleNumber;
  title: string;
  shortTitle: string;
  description: string;
  weight: string;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    module: 1,
    title: "Mobilität",
    shortTitle: "Mobilität",
    description: "Wie gut können Sie sich innerhalb und außerhalb Ihrer Wohnung bewegen?",
    weight: "10%",
  },
  {
    module: 2,
    title: "Kognitive und kommunikative Fähigkeiten",
    shortTitle: "Kognitiv",
    description: "Wie gut können Sie sich orientieren, erinnern und verständigen?",
    weight: "15% (MAX mit Modul 3)",
  },
  {
    module: 3,
    title: "Verhaltensweisen und psychische Problemlagen",
    shortTitle: "Verhalten",
    description: "Wie häufig treten Verhaltensauffälligkeiten oder psychische Belastungen auf?",
    weight: "15% (MAX mit Modul 2)",
  },
  {
    module: 4,
    title: "Selbstversorgung",
    shortTitle: "Selbstversorgung",
    description: "Wie selbständig sind Sie bei der Körperpflege und Ernährung?",
    weight: "40%",
  },
  {
    module: 5,
    title: "Umgang mit krankheitsbedingten Anforderungen",
    shortTitle: "Krankheit",
    description: "Welche medizinischen Maßnahmen sind nötig und wie selbständig führen Sie diese durch?",
    weight: "20%",
  },
  {
    module: 6,
    title: "Gestaltung des Alltagslebens",
    shortTitle: "Alltag",
    description: "Wie selbständig können Sie Ihren Tagesablauf gestalten und soziale Kontakte pflegen?",
    weight: "15%",
  },
];

// --- Fragen ---

export const NBA_QUESTIONS: NbaQuestion[] = [
  // === Modul 1: Mobilität (5 Fragen) ===
  {
    id: "m1_01",
    module: 1,
    label: "Positionswechsel im Bett",
    description: "Sich im Bett umdrehen, aufsetzen oder eine andere Position einnehmen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m1_02",
    module: 1,
    label: "Stabile Sitzposition halten",
    description: "Aufrecht sitzen bleiben, z.B. auf einem Stuhl oder am Bettrand.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m1_03",
    module: 1,
    label: "Aufstehen aus sitzender Position",
    description: "Von einem Stuhl, dem Bett oder der Toilette aufstehen und sich umsetzen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m1_04",
    module: 1,
    label: "Fortbewegen innerhalb der Wohnung",
    description: "Sich in der Wohnung von Raum zu Raum bewegen, auch mit Hilfsmitteln wie Rollator.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m1_05",
    module: 1,
    label: "Treppensteigen",
    description: "Eine Treppe hinauf- und hinabsteigen, mindestens eine Etage.",
    scale: INDEPENDENCE_SCALE,
  },

  // === Modul 2: Kognitive und kommunikative Fähigkeiten (11 Fragen) ===
  {
    id: "m2_01",
    module: 2,
    label: "Erkennen von Personen aus dem näheren Umfeld",
    description: "Können Sie Familienangehörige, Nachbarn oder Pflegekräfte erkennen?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_02",
    module: 2,
    label: "Örtliche Orientierung",
    description: "Wissen Sie, wo Sie sich befinden (z.B. zu Hause, im Krankenhaus)?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_03",
    module: 2,
    label: "Zeitliche Orientierung",
    description: "Kennen Sie den Wochentag, die Tageszeit und die Jahreszeit?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_04",
    module: 2,
    label: "Erinnern an wesentliche Ereignisse",
    description: "Können Sie sich an kürzlich Geschehenes erinnern (z.B. Besuche, Mahlzeiten)?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_05",
    module: 2,
    label: "Steuern von mehrschrittigen Alltagshandlungen",
    description: "Können Sie Handlungen planen und in der richtigen Reihenfolge ausführen (z.B. Kaffee kochen)?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_06",
    module: 2,
    label: "Treffen von Entscheidungen im Alltag",
    description: "Können Sie alltägliche Entscheidungen treffen (z.B. was anziehen, was essen)?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_07",
    module: 2,
    label: "Verstehen von Sachverhalten und Informationen",
    description: "Können Sie einfache Zusammenhänge verstehen (z.B. eine Nachricht, einen Arztbrief)?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_08",
    module: 2,
    label: "Erkennen von Risiken und Gefahren",
    description: "Können Sie Gefahren erkennen (z.B. heiße Herdplatte, Stolperfallen)?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_09",
    module: 2,
    label: "Mitteilen von elementaren Bedürfnissen",
    description: "Können Sie Hunger, Durst, Schmerzen oder andere Bedürfnisse äußern?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_10",
    module: 2,
    label: "Verstehen von Aufforderungen",
    description: "Verstehen Sie einfache Bitten oder Anweisungen (z.B. 'Bitte setzen Sie sich')?",
    scale: ABILITY_SCALE,
  },
  {
    id: "m2_11",
    module: 2,
    label: "Beteiligen an einem Gespräch",
    description: "Können Sie einem Gespräch folgen und sich daran beteiligen?",
    scale: ABILITY_SCALE,
  },

  // === Modul 3: Verhaltensweisen und psychische Problemlagen (13 Fragen) ===
  {
    id: "m3_01",
    module: 3,
    label: "Motorisch geprägte Verhaltensauffälligkeiten",
    description: "Z.B. zielloses Umherlaufen, ständiges Aufstehen, Nesteln an Kleidung.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_02",
    module: 3,
    label: "Nächtliche Unruhe",
    description: "Aufstehen in der Nacht, Schlafstörungen, Umherwandern.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_03",
    module: 3,
    label: "Selbstschädigendes und autoaggressives Verhalten",
    description: "Z.B. sich selbst verletzen, Haare ausreißen, Nahrung verweigern.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_04",
    module: 3,
    label: "Beschädigen von Gegenständen",
    description: "Z.B. Geschirr werfen, Möbel beschädigen, Kleidung zerreißen.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_05",
    module: 3,
    label: "Physisch aggressives Verhalten gegenüber anderen",
    description: "Z.B. Schlagen, Beißen, Kratzen, Treten.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_06",
    module: 3,
    label: "Verbale Aggression",
    description: "Z.B. Beschimpfen, Schreien, Drohen.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_07",
    module: 3,
    label: "Andere vokale Auffälligkeiten",
    description: "Z.B. lautes Rufen, Stöhnen, Schreien ohne erkennbaren Grund.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_08",
    module: 3,
    label: "Abwehr pflegerischer und anderer Maßnahmen",
    description: "Sich gegen Hilfe bei der Pflege, beim Anziehen oder Essen wehren.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_09",
    module: 3,
    label: "Wahnvorstellungen",
    description: "Überzeugungen, die nicht der Realität entsprechen (z.B. bestohlen werden).",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_10",
    module: 3,
    label: "Ängste",
    description: "Starke Ängste oder Panikattacken im Alltag.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_11",
    module: 3,
    label: "Antriebslosigkeit bei depressiver Stimmungslage",
    description: "Kein Interesse an Aktivitäten, Rückzug, Teilnahmslosigkeit.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_12",
    module: 3,
    label: "Depressive Stimmungslage",
    description: "Anhaltende Traurigkeit, Hoffnungslosigkeit, Weinen.",
    scale: FREQUENCY_SCALE,
  },
  {
    id: "m3_13",
    module: 3,
    label: "Sozial inadäquate Verhaltensweisen",
    description: "Z.B. sich in der Öffentlichkeit entkleiden, distanzloses Verhalten.",
    scale: FREQUENCY_SCALE,
  },

  // === Modul 4: Selbstversorgung (13 Fragen) ===
  {
    id: "m4_01",
    module: 4,
    label: "Waschen des vorderen Oberkörpers",
    description: "Gesicht, Hals, Arme, Hände und Oberkörper waschen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_02",
    module: 4,
    label: "Körperpflege im Bereich des Kopfes",
    description: "Zähneputzen, Kämmen, Rasieren, Gesichtspflege.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_03",
    module: 4,
    label: "Waschen des Intimbereichs",
    description: "Den Intimbereich waschen und pflegen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_04",
    module: 4,
    label: "Duschen und Baden",
    description: "Einschließlich Waschen der Haare.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_05",
    module: 4,
    label: "An- und Auskleiden des Oberkörpers",
    description: "Hemd, Pullover, BH oder Jacke an- und ausziehen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_06",
    module: 4,
    label: "An- und Auskleiden des Unterkörpers",
    description: "Hose, Unterwäsche, Socken, Schuhe an- und ausziehen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_07",
    module: 4,
    label: "Mundgerechtes Zubereiten der Nahrung",
    description: "Brot streichen, Essen schneiden, Getränk einschenken.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_08",
    module: 4,
    label: "Essen",
    description: "Nahrung zum Mund führen und kauen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_09",
    module: 4,
    label: "Trinken",
    description: "Glas oder Tasse zum Mund führen und trinken.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_10",
    module: 4,
    label: "Benutzung einer Toilette oder eines Toilettenstuhls",
    description: "Toilettengang einschließlich Intimhygiene.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_11",
    module: 4,
    label: "Bewältigen der Folgen einer Harninkontinenz",
    description: "Inkontinenzmaterial wechseln und entsorgen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_12",
    module: 4,
    label: "Bewältigen der Folgen einer Stuhlinkontinenz",
    description: "Inkontinenzmaterial wechseln und Körper reinigen.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m4_13",
    module: 4,
    label: "Ernährung parenteral oder über Sonde",
    description: "Sondennahrung vorbereiten und verabreichen (falls zutreffend).",
    scale: INDEPENDENCE_SCALE,
  },

  // === Modul 5: Umgang mit krankheitsbedingten Anforderungen (16 Fragen) ===
  {
    id: "m5_01",
    module: 5,
    label: "Medikation",
    description: "Medikamente richten und einnehmen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_02",
    module: 5,
    label: "Injektionen (z.B. Insulin)",
    description: "Spritzen vorbereiten und verabreichen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_03",
    module: 5,
    label: "Versorgung intravenöser Zugänge",
    description: "Infusionen und venöse Zugänge versorgen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_04",
    module: 5,
    label: "Absaugen und Sauerstoffgabe",
    description: "Absaugen von Sekreten, Sauerstoffversorgung.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_05",
    module: 5,
    label: "Einreibungen oder Kälte-/Wärmeanwendungen",
    description: "Salben auftragen, Wickel anlegen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_06",
    module: 5,
    label: "Messung und Deutung von Körperzuständen",
    description: "Blutdruck, Blutzucker, Temperatur messen und einschätzen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_07",
    module: 5,
    label: "Umgang mit körpernahen Hilfsmitteln",
    description: "Prothesen, Hörgeräte, Kompressionsstrümpfe anlegen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_08",
    module: 5,
    label: "Verbandswechsel und Wundversorgung",
    description: "Wunden reinigen und Verbände anlegen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_09",
    module: 5,
    label: "Versorgung mit Stoma",
    description: "Stomabeutel wechseln und Stomaversorgung (falls zutreffend).",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_10",
    module: 5,
    label: "Regelmäßige Einmalkatheterisierung",
    description: "Katheter setzen und entfernen (falls zutreffend).",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_11",
    module: 5,
    label: "Nutzung von Abführmethoden",
    description: "Einläufe oder Abführmittel anwenden.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_12",
    module: 5,
    label: "Überwachung und Pflege von Shunt/Dialysezugang",
    description: "Dialysezugang kontrollieren und pflegen (falls zutreffend).",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_13",
    module: 5,
    label: "Therapiemaßnahmen zu Hause",
    description: "Übungen, Atemtherapie, Physiotherapie durchführen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_14",
    module: 5,
    label: "Arztbesuche",
    description: "Arzttermine wahrnehmen, dorthin gelangen, Befunde besprechen.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_15",
    module: 5,
    label: "Besuch anderer medizinischer Einrichtungen",
    description: "Z.B. Dialyse, Bestrahlung, Ergotherapie.",
    scale: CARE_NEED_SCALE,
  },
  {
    id: "m5_16",
    module: 5,
    label: "Einhaltung einer Diät oder anderer Verhaltensvorschriften",
    description: "Ernährungsvorschriften einhalten, z.B. bei Diabetes.",
    scale: CARE_NEED_SCALE,
  },

  // === Modul 6: Gestaltung des Alltagslebens (6 Fragen) ===
  {
    id: "m6_01",
    module: 6,
    label: "Gestaltung des Tagesablaufs und Anpassung an Veränderungen",
    description: "Den Tag planen, Termine einhalten, auf Unvorhergesehenes reagieren.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m6_02",
    module: 6,
    label: "Ruhen und Schlafen",
    description: "Einen angemessenen Schlaf-Wach-Rhythmus einhalten.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m6_03",
    module: 6,
    label: "Sich beschäftigen",
    description: "Einer Beschäftigung nachgehen (z.B. Lesen, Handarbeiten, Fernsehen).",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m6_04",
    module: 6,
    label: "Vornehmen von in die Zukunft gerichteten Planungen",
    description: "Verabredungen treffen, Einkäufe planen, Termine vereinbaren.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m6_05",
    module: 6,
    label: "Interaktion mit Personen im direkten Kontakt",
    description: "Gespräche führen, auf andere eingehen, angemessen reagieren.",
    scale: INDEPENDENCE_SCALE,
  },
  {
    id: "m6_06",
    module: 6,
    label: "Kontaktpflege zu Personen außerhalb des direkten Umfeldes",
    description: "Telefonieren, Briefe schreiben, Besuche organisieren.",
    scale: INDEPENDENCE_SCALE,
  },
];

/**
 * Gibt alle Fragen fuer ein bestimmtes Modul zurueck.
 */
export function getQuestionsForModule(module: ModuleNumber): NbaQuestion[] {
  return NBA_QUESTIONS.filter((q) => q.module === module);
}

/**
 * Berechnet den Rohwert fuer ein Modul basierend auf den Antworten.
 */
export function calculateModuleRawScore(
  module: ModuleNumber,
  answers: Record<string, number>,
): number {
  const questions = getQuestionsForModule(module);
  let sum = 0;
  for (const q of questions) {
    sum += answers[q.id] ?? 0;
  }
  return sum;
}
