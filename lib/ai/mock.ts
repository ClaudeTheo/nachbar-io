// lib/ai/mock.ts
// In-Memory-Mock-Provider fuer Tests.
// - .calls: zeichnet alle Inputs auf
// - .setResponse(r): nimmt eine Response und gibt sie bei jedem chat() zurueck
// - .setResponses([r1, r2, ...]): FIFO-Queue, danach Default-Response
// Default-Response: { text: "mock response", tool_calls: [], stop_reason: "end_turn", usage: {0,0} }

import type { AIChatInput, AIProvider, AIResponse } from "./types";

const DEFAULT_RESPONSE: AIResponse = {
  text: "mock response",
  tool_calls: [],
  stop_reason: "end_turn",
  usage: { input_tokens: 0, output_tokens: 0 },
};

export interface MockProvider extends AIProvider {
  readonly calls: AIChatInput[];
  setResponse(response: AIResponse): void;
  setResponses(responses: AIResponse[]): void;
  reset(): void;
}

class MockProviderImpl implements MockProvider {
  public readonly name = "mock" as const;
  public readonly calls: AIChatInput[] = [];
  // Queue von geskripteten Responses. Wird FIFO konsumiert.
  private queue: AIResponse[] = [];
  // Wenn gesetzt via setResponse() - wird immer wieder zurueckgegeben.
  private sticky: AIResponse | null = null;

  async chat(input: AIChatInput): Promise<AIResponse> {
    this.calls.push(input);
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }
    if (this.sticky) {
      return this.sticky;
    }
    return { ...DEFAULT_RESPONSE };
  }

  setResponse(response: AIResponse): void {
    this.sticky = response;
    this.queue = [];
  }

  setResponses(responses: AIResponse[]): void {
    this.queue = [...responses];
    this.sticky = null;
  }

  reset(): void {
    this.calls.length = 0;
    this.queue = [];
    this.sticky = null;
  }
}

export function createMockProvider(): MockProvider {
  return new MockProviderImpl();
}
