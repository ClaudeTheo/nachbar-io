// lib/ai/off.ts
// "Aus"-Provider: wirft bei jedem chat()-Call eine klare Fehlermeldung.
// Wird verwendet wenn AI_PROVIDER nicht gesetzt ist oder explizit "off".

import {
  AIProviderError,
  type AIChatInput,
  type AIProvider,
  type AIResponse,
} from "./types";

class OffProvider implements AIProvider {
  public readonly name = "off" as const;

  async chat(_input: AIChatInput): Promise<AIResponse> {
    throw new AIProviderError(
      "off",
      "AI provider is disabled (AI_PROVIDER=off). Set AI_PROVIDER to 'claude' or 'mistral' to enable.",
    );
  }
}

export function createOffProvider(): AIProvider {
  return new OffProvider();
}
