import type { MemorySaveProposal, SaveDecision } from "../types";
import { validateMemorySave } from "./facts.service";

export function buildMemoryTool() {
  return {
    name: "save_memory",
    description:
      "Schlage vor, einen dauerhaften Fakt ueber den Nutzer zu speichern. " +
      "Nur fuer klar formulierte, dauerhafte persoenliche Fakten. " +
      "KEINE Diagnosen, Medikamente, Vitalwerte oder Therapien speichern.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "profile",
            "routine",
            "preference",
            "contact",
            "care_need",
            "personal",
          ],
          description: "Kategorie des Fakts",
        },
        key: {
          type: "string",
          description:
            'Kurzer Schluessel (z.B. "morgen_kaffee", "tochter_name")',
        },
        value: {
          type: "string",
          description: "Der Fakt als kurzer Satz",
        },
        confidence: {
          type: "number",
          description: "Wie sicher bist du, dass das dauerhaft stimmt? 0.0-1.0",
        },
        needs_confirmation: {
          type: "boolean",
          description: "Soll der Nutzer vorher gefragt werden?",
        },
      },
      required: [
        "category",
        "key",
        "value",
        "confidence",
        "needs_confirmation",
      ],
    },
  };
}

// Tool-Call von Claude verarbeiten
export function processMemoryToolCall(
  toolInput: MemorySaveProposal,
  context: { hasConsent: boolean; factCount: number; maxFacts: number },
): SaveDecision {
  return validateMemorySave(toolInput, context);
}
