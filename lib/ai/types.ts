// lib/ai/types.ts
// Gemeinsame Typen fuer die AI-Provider-Abstraktion.
// Interface ist provider-neutral: Claude/Mistral/Mock/Off implementieren es.

export type AIRole = "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>; // JSON Schema
}

export interface AIToolCall {
  name: string;
  input: Record<string, unknown>;
}

export type AIStopReason = "end_turn" | "tool_use" | "max_tokens" | "other";

export interface AIResponse {
  text: string; // Assistant-sichtbarer Text (kann "" sein, wenn nur Tool-Calls)
  tool_calls: AIToolCall[]; // Leeres Array wenn keine
  stop_reason: AIStopReason;
  usage: { input_tokens: number; output_tokens: number };
}

export interface AIChatInput {
  system: string;
  messages: AIMessage[];
  tools?: AIToolSchema[];
  max_tokens?: number; // Default 1024
}

export type AIProviderName = "claude" | "mistral" | "off" | "mock";

export interface AIProvider {
  readonly name: AIProviderName;
  chat(input: AIChatInput): Promise<AIResponse>;
}

/**
 * Gemeinsame Fehlerklasse fuer Provider-seitige Fehler (HTTP-Fehler,
 * Parse-Fehler, Konfigurationsfehler).
 */
export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/**
 * Signatur fuer injizierbares fetch - erlaubt Tests ohne Netzwerk.
 */
export type FetchImpl = typeof fetch;
