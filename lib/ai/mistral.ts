// lib/ai/mistral.ts
// Mistral-AI-Implementierung via direktem fetch (KEIN SDK).
// Endpoint: POST https://api.mistral.ai/v1/chat/completions
// Headers: Authorization: Bearer <key>, content-type=application/json
// OpenAI-style Body. System-Message wird als erste Message mit role=system gesetzt.

import {
  AIProviderError,
  type AIChatInput,
  type AIProvider,
  type AIResponse,
  type AIStopReason,
  type AIToolCall,
  type FetchImpl,
} from "./types";

const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-medium-latest";
const DEFAULT_MAX_TOKENS = 1024;

export interface MistralProviderOptions {
  apiKey: string;
  model?: string;
  /** Injizierbares fetch fuer Tests. Default: globales fetch. */
  fetchImpl?: FetchImpl;
}

interface MistralToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface MistralMessage {
  role?: string;
  content?: string | null;
  tool_calls?: MistralToolCall[];
}

interface MistralChoice {
  message?: MistralMessage;
  finish_reason?: string;
}

interface MistralResponseBody {
  choices?: MistralChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function mapFinishReason(raw: string | undefined): AIStopReason {
  switch (raw) {
    case "stop":
      return "end_turn";
    case "tool_calls":
      return "tool_use";
    case "length":
      return "max_tokens";
    default:
      return "other";
  }
}

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    // Mistral liefert gelegentlich ungueltiges JSON - wir schlucken es, damit
    // der Tool-Call nicht komplett verloren geht (Name bleibt erhalten).
    return {};
  }
}

class MistralProvider implements AIProvider {
  public readonly name = "mistral" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: FetchImpl,
  ) {}

  async chat(input: AIChatInput): Promise<AIResponse> {
    // OpenAI-Style: system als erste Message.
    const messages = [
      { role: "system", content: input.system },
      ...input.messages,
    ];

    // OpenAI-Function-Calling-Shape: { type: "function", function: { name, description, parameters } }
    const tools =
      input.tools && input.tools.length > 0
        ? input.tools.map((t) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description,
              parameters: t.input_schema,
            },
          }))
        : undefined;

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: input.max_tokens ?? DEFAULT_MAX_TOKENS,
    };
    if (tools) body.tools = tools;

    let response: Response;
    try {
      response = await this.fetchImpl(MISTRAL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AIProviderError(
        "mistral",
        `Mistral API fetch failed: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      let errText = "";
      try {
        errText = await response.text();
      } catch {
        errText = "";
      }
      throw new AIProviderError(
        "mistral",
        `Mistral API HTTP ${response.status}: ${errText}`,
      );
    }

    let parsed: MistralResponseBody;
    try {
      parsed = (await response.json()) as MistralResponseBody;
    } catch (err) {
      throw new AIProviderError(
        "mistral",
        `Mistral API response not JSON: ${(err as Error).message}`,
      );
    }

    const choice = parsed.choices?.[0];
    const message = choice?.message;
    const text = typeof message?.content === "string" ? message.content : "";

    const toolCalls: AIToolCall[] = (message?.tool_calls ?? []).map((tc) => ({
      name: tc.function?.name ?? "",
      input: parseToolArguments(tc.function?.arguments),
    }));

    return {
      text,
      tool_calls: toolCalls,
      stop_reason: mapFinishReason(choice?.finish_reason),
      usage: {
        input_tokens: parsed.usage?.prompt_tokens ?? 0,
        output_tokens: parsed.usage?.completion_tokens ?? 0,
      },
    };
  }
}

export function createMistralProvider(
  options: MistralProviderOptions,
): AIProvider {
  if (!options.apiKey) {
    throw new AIProviderError("mistral", "MISTRAL_API_KEY is required");
  }
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  return new MistralProvider(options.apiKey, model, fetchImpl);
}
