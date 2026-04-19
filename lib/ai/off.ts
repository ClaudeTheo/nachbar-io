// lib/ai/off.ts
// "Aus"-Provider: wirft bei jedem chat()-Call eine klare Fehlermeldung.
// Wird verwendet wenn AI_PROVIDER nicht gesetzt ist oder explizit "off".

import type { AIChatInput, AIProvider, AIResponse } from "./types";

class OffProvider implements AIProvider {
  public readonly name = "off" as const;

  async chat(_input: AIChatInput): Promise<AIResponse> {
    // Unused parameter, aber Interface verlangt die Signatur.
    void _input;
    throw new Error(
      "AI provider is disabled (AI_PROVIDER=off). Set AI_PROVIDER to 'claude' or 'mistral' to enable.",
    );
  }
}

export function createOffProvider(): AIProvider {
  return new OffProvider();
}
