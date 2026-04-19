// lib/ai/claude.ts
// Anthropic-Claude-Implementierung via direktem fetch (KEIN SDK).
// Endpoint: POST https://api.anthropic.com/v1/messages
// Headers: x-api-key, anthropic-version=2023-06-01, content-type=application/json
// fetchImpl ist injizierbar fuer Tests.

import {
  AIProviderError,
  type AIChatInput,
  type AIProvider,
  type AIResponse,
  type AIStopReason,
  type AIToolCall,
  type FetchImpl,
} from "./types";

const CLAUDE_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 1024;

export interface ClaudeProviderOptions {
  apiKey: string;
  model?: string;
  /** Injizierbares fetch fuer Tests. Default: globales fetch. */
  fetchImpl?: FetchImpl;
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface ClaudeResponseBody {
  content?: ClaudeContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function mapStopReason(raw: string | undefined): AIStopReason {
  switch (raw) {
    case "end_turn":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    default:
      return "other";
  }
}

class ClaudeProvider implements AIProvider {
  public readonly name = "claude" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: FetchImpl,
  ) {}

  async chat(input: AIChatInput): Promise<AIResponse> {
    const body = {
      model: this.model,
      max_tokens: input.max_tokens ?? DEFAULT_MAX_TOKENS,
      system: input.system,
      messages: input.messages,
      ...(input.tools && input.tools.length > 0 ? { tools: input.tools } : {}),
    };

    let response: Response;
    try {
      response = await this.fetchImpl(CLAUDE_ENDPOINT, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AIProviderError(
        "claude",
        `Claude API fetch failed: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      // Versucht den Fehlertext zu lesen, aber bricht nie wegen JSON-Parse-Fehlern ab.
      let errText = "";
      try {
        errText = await response.text();
      } catch {
        errText = "";
      }
      throw new AIProviderError(
        "claude",
        `Claude API HTTP ${response.status}: ${errText}`,
      );
    }

    let parsed: ClaudeResponseBody;
    try {
      parsed = (await response.json()) as ClaudeResponseBody;
    } catch (err) {
      throw new AIProviderError(
        "claude",
        `Claude API response not JSON: ${(err as Error).message}`,
      );
    }

    const content = parsed.content ?? [];
    const textParts: string[] = [];
    const toolCalls: AIToolCall[] = [];
    for (const block of content) {
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      } else if (block.type === "tool_use" && block.name) {
        toolCalls.push({
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    return {
      text: textParts.join(""),
      tool_calls: toolCalls,
      stop_reason: mapStopReason(parsed.stop_reason),
      usage: {
        input_tokens: parsed.usage?.input_tokens ?? 0,
        output_tokens: parsed.usage?.output_tokens ?? 0,
      },
    };
  }
}

export function createClaudeProvider(
  options: ClaudeProviderOptions,
): AIProvider {
  if (!options.apiKey) {
    throw new AIProviderError("claude", "ANTHROPIC_API_KEY is required");
  }
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  return new ClaudeProvider(options.apiKey, model, fetchImpl);
}
