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
  /**
   * Provider-neutraler Opt-in fuer Prompt-Caching. Per-Call-Flags markieren,
   * welche Teile des Payloads als statisch gelten und gecached werden duerfen.
   * - `system`: System-Prompt wird bei Claude als Content-Block mit
   *   cache_control:ephemeral gesendet (5 min TTL, -90 % Input-Kosten).
   * - `messages`: reserviert fuer Multi-Turn-Caching (noch nicht implementiert).
   * Andere Provider (Mistral, Mock) ignorieren das Feld.
   *
   * Historie: ersetzt das engere `system_cached?: boolean` aus Welle C C5a
   * (Codex-Review NACHBESSERN F7, 2026-04-20).
   */
  cache_control?: {
    system?: boolean;
    messages?: boolean;
  };
}

export type AIProviderName = "claude" | "mistral" | "off" | "mock";

export interface AIProvider {
  /** Identifier fuer Telemetrie/Logging/Tests. Kein Routing-Key, nicht zur Provider-Auswahl gedacht. */
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
