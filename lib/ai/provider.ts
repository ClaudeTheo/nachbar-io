// lib/ai/provider.ts
// Factory + Barrel fuer die AI-Provider-Abstraktion.
//
// getProvider() liest process.env.AI_PROVIDER:
//   - "claude"  -> ClaudeProvider (benoetigt ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL)
//   - "mistral" -> MistralProvider (benoetigt MISTRAL_API_KEY, optional MISTRAL_MODEL)
//   - "off"     -> OffProvider (chat() wirft immer)
//   - "mock"    -> MockProvider (in-memory Mock fuer Tests)
//   - undefined -> Default "off"
//
// Fehlende API-Keys fuehren zu einem lauten Fehler - KEIN stilles Fallback auf off.

import { createClaudeProvider } from "./claude";
import { createMistralProvider } from "./mistral";
import { createMockProvider } from "./mock";
import { createOffProvider } from "./off";
import { AIProviderError, type AIProvider } from "./types";
import type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";

export type {
  AIChatInput,
  AIMessage,
  AIProvider,
  AIProviderName,
  AIResponse,
  AIRole,
  AIStopReason,
  AIToolCall,
  AIToolSchema,
  FetchImpl,
} from "./types";
export { AIProviderError } from "./types";
export { createClaudeProvider } from "./claude";
export { createMistralProvider } from "./mistral";
export { createMockProvider, type MockProvider } from "./mock";
export { createOffProvider } from "./off";

export interface AiAssistanceBackendPreset {
  level: "basic" | "everyday";
  maxTokens: number;
  loadMemoryContext: boolean;
  allowMemoryTool: boolean;
  systemPromptSuffix: string;
}

const BASIC_AI_ASSISTANCE_PRESET: AiAssistanceBackendPreset = {
  level: "basic",
  maxTokens: 512,
  loadMemoryContext: false,
  allowMemoryTool: false,
  systemPromptSuffix:
    "Stufe Basis: Helfen Sie kurz, einfach und ruhig bei App-Hilfe, Vorlesen und Orientierung. Bleiben Sie bei oberflaechlicher Hilfe, stellen Sie keine tieferen Alltags-Rueckfragen und speichern Sie keine neuen Erinnerungen.",
};

const EVERYDAY_AI_ASSISTANCE_PRESET: AiAssistanceBackendPreset = {
  level: "everyday",
  maxTokens: 1024,
  loadMemoryContext: true,
  allowMemoryTool: true,
  systemPromptSuffix:
    "Stufe Alltag: Sie duerfen beim Formulieren, Verstehen und bei kleinen Alltagsfragen helfen. Wenn es klar passt, duerfen Sie dafuer auch vorhandenen Memory-Kontext nutzen und neue Erinnerungen ueber das freigegebene Tool speichern.",
};

export function getAiAssistanceBackendPreset(
  level: AiAssistanceLevel,
): AiAssistanceBackendPreset {
  return level === "everyday"
    ? EVERYDAY_AI_ASSISTANCE_PRESET
    : BASIC_AI_ASSISTANCE_PRESET;
}

export function getProvider(): AIProvider {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase() ?? "off";

  switch (raw) {
    case "":
    case "off":
      return createOffProvider();

    case "mock":
      return createMockProvider();

    case "claude": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new AIProviderError(
          "claude",
          "AI_PROVIDER=claude but ANTHROPIC_API_KEY is not set",
        );
      }
      return createClaudeProvider({
        apiKey,
        model: process.env.ANTHROPIC_MODEL,
      });
    }

    case "mistral": {
      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) {
        throw new AIProviderError(
          "mistral",
          "AI_PROVIDER=mistral but MISTRAL_API_KEY is not set",
        );
      }
      return createMistralProvider({
        apiKey,
        model: process.env.MISTRAL_MODEL,
      });
    }

    default:
      throw new AIProviderError(
        "unknown",
        `Unknown AI_PROVIDER value: "${raw}". Expected one of: claude, mistral, off, mock.`,
      );
  }
}
