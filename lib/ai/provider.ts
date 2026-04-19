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
