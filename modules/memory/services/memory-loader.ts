import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantContext, MemoryFact, MemoryCategory } from "../types";
import { hasConsent } from "./consent.service";
import { getFactsByCategory } from "./facts.service";
import { decryptField } from "@/lib/care/field-encryption";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  profile: "Profil",
  routine: "Routinen",
  preference: "Vorlieben",
  contact: "Kontakte",
  care_need: "Alltagsbeduerfnisse",
  personal: "Privates",
};

// Keyword-basiertes Relevanz-Ranking
export function rankByRelevance(
  facts: MemoryFact[],
  message: string,
): MemoryFact[] {
  const words = message.toLowerCase().split(/\s+/);

  const scored = facts.map((fact) => {
    const factWords = `${fact.key} ${fact.value}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (word.length < 3) continue; // Stoppwoerter ignorieren
      if (factWords.includes(word)) score += 1;
    }
    return { fact, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((s) => s.fact);
}

// Care-Relevanz pruefen
function isCareRelevant(message: string): boolean {
  const careKeywords = [
    "hilfe",
    "unterstuetzung",
    "brauche",
    "schwierig",
    "problem",
    "einkaufen",
    "treppen",
    "rollator",
    "alltag",
    "pflege",
  ];
  const lower = message.toLowerCase();
  return careKeywords.some((kw) => lower.includes(kw));
}

function isPersonalRelevant(message: string): boolean {
  const personalKeywords = [
    "privat",
    "persoenlich",
    "geheim",
    "notiz",
    "wichtig",
  ];
  const lower = message.toLowerCase();
  return personalKeywords.some((kw) => lower.includes(kw));
}

// Prompt-Block bauen
export function buildPromptBlock(
  core: MemoryFact[],
  relevant: MemoryFact[],
  sensitive: MemoryFact[],
): string {
  if (core.length === 0 && relevant.length === 0 && sensitive.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Core-Profil
  const name = core.find((f) => f.key === "name")?.value;
  const anrede = core.find((f) => f.key === "anrede")?.value || "Sie";

  if (name) {
    lines.push(`Du sprichst mit ${name}. Sprich mit "${anrede}" an.`);
  }

  // Relevante Fakten nach Kategorie gruppieren
  const allFacts = [
    ...core.filter((f) => f.key !== "name" && f.key !== "anrede"),
    ...relevant,
    ...sensitive,
  ];

  const grouped = new Map<MemoryCategory, string[]>();
  for (const fact of allFacts) {
    if (!grouped.has(fact.category)) grouped.set(fact.category, []);
    grouped.get(fact.category)!.push(fact.value);
  }

  if (grouped.size > 0) {
    lines.push("");
    lines.push("Was du ueber diese Person weisst:");
    for (const [category, values] of grouped) {
      lines.push(`- ${CATEGORY_LABELS[category]}: ${values.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("Regeln fuer dein Gedaechtnis:");
  lines.push("- Nutze Erinnerungen unterstuetzend, nicht aufdringlich");
  lines.push("- Erfinde KEINE persoenlichen Fakten");
  lines.push("- Wenn eine Erinnerung veraltet scheint, frage hoeflich nach");
  lines.push("- Speichere KEINE Diagnosen, Medikamente oder Finanzdaten");
  lines.push("- Bei Unsicherheit: lieber nachfragen als falsch merken");

  return lines.join("\n");
}

// Hauptfunktion: Memory laden (3-Stufen-Strategie)
export async function loadMemoryContext(
  supabase: SupabaseClient,
  userId: string,
  message: string,
  assistantContext: AssistantContext,
): Promise<string> {
  // Free/Public: kein Memory
  if (assistantContext === "free_chat" || assistantContext === "kiosk_public") {
    return "";
  }

  try {
    // Stufe 1: IMMER — Core-Profil
    const core = await getFactsByCategory(supabase, userId, ["profile"]);

    // Stufe 2: WENN RELEVANT — Basis-Memory
    let relevant: MemoryFact[] = [];
    if (await hasConsent(supabase, userId, "memory_basis")) {
      const allBasis = await getFactsByCategory(supabase, userId, [
        "routine",
        "preference",
        "contact",
      ]);
      relevant = rankByRelevance(allBasis, message).slice(0, 10);
    }

    // Stufe 3: NUR wenn alle 3 Bedingungen erfuellt
    const sensitive: MemoryFact[] = [];

    if (assistantContext === "plus_chat" || assistantContext === "kiosk_plus") {
      // care_need
      if (
        (await hasConsent(supabase, userId, "memory_care")) &&
        isCareRelevant(message)
      ) {
        const careNeedFacts = await getFactsByCategory(supabase, userId, [
          "care_need",
        ]);
        // Entschluesseln
        for (const fact of careNeedFacts) {
          if (fact.value_encrypted) {
            try {
              fact.value = decryptField(fact.value) ?? fact.value;
            } catch {
              /* skip */
            }
          }
        }
        sensitive.push(...careNeedFacts);
      }

      // personal
      if (
        (await hasConsent(supabase, userId, "memory_personal")) &&
        isPersonalRelevant(message)
      ) {
        const personalFacts = await getFactsByCategory(supabase, userId, [
          "personal",
        ]);
        for (const fact of personalFacts) {
          if (fact.value_encrypted) {
            try {
              fact.value = decryptField(fact.value) ?? fact.value;
            } catch {
              /* skip */
            }
          }
        }
        sensitive.push(...personalFacts);
      }
    }

    // Care-Team: nur care_need mit Org-Zugehoerigkeit (RLS regelt Zugriff)
    if (assistantContext === "care_team") {
      if (
        (await hasConsent(supabase, userId, "memory_care")) &&
        isCareRelevant(message)
      ) {
        const careTeamFacts = await getFactsByCategory(supabase, userId, [
          "care_need",
        ]);
        for (const fact of careTeamFacts) {
          if (fact.value_encrypted) {
            try {
              fact.value = decryptField(fact.value) ?? fact.value;
            } catch {
              /* skip */
            }
          }
        }
        sensitive.push(...careTeamFacts);
      }
    }

    return buildPromptBlock(core, relevant, sensitive);
  } catch (error) {
    // Fallback: Chat antwortet auch ohne Memory
    console.error("[memory-loader] Fehler beim Laden:", error);
    return "";
  }
}
