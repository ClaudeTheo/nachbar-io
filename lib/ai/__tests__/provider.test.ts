// lib/ai/__tests__/provider.test.ts
// Tests fuer die AI-Provider-Abstraktion (Claude / Mistral / Off / Mock).
// Keine echten API-Calls - fetch wird injiziert und gemockt.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AIProviderError,
  type AIChatInput,
  type AIResponse,
  createClaudeProvider,
  createMistralProvider,
  createMockProvider,
  createOffProvider,
  getProvider,
} from "@/lib/ai/provider";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of [
    "AI_PROVIDER",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
    "MISTRAL_API_KEY",
    "MISTRAL_MODEL",
  ]) {
    delete process.env[key];
  }
}

describe("getProvider factory", () => {
  beforeEach(() => {
    resetEnv();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("defaults to 'off' when AI_PROVIDER is unset", () => {
    const provider = getProvider();
    expect(provider.name).toBe("off");
  });

  it("returns MockProvider when AI_PROVIDER=mock", () => {
    process.env.AI_PROVIDER = "mock";
    const provider = getProvider();
    expect(provider.name).toBe("mock");
  });

  it("returns OffProvider when AI_PROVIDER=off", () => {
    process.env.AI_PROVIDER = "off";
    const provider = getProvider();
    expect(provider.name).toBe("off");
  });

  it("returns ClaudeProvider when AI_PROVIDER=claude and ANTHROPIC_API_KEY set", () => {
    process.env.AI_PROVIDER = "claude";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const provider = getProvider();
    expect(provider.name).toBe("claude");
  });

  it("throws when AI_PROVIDER=claude but ANTHROPIC_API_KEY missing", () => {
    process.env.AI_PROVIDER = "claude";
    expect(() => getProvider()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("returns MistralProvider when AI_PROVIDER=mistral and MISTRAL_API_KEY set", () => {
    process.env.AI_PROVIDER = "mistral";
    process.env.MISTRAL_API_KEY = "mist-test";
    const provider = getProvider();
    expect(provider.name).toBe("mistral");
  });

  it("throws when AI_PROVIDER=mistral but MISTRAL_API_KEY missing", () => {
    process.env.AI_PROVIDER = "mistral";
    expect(() => getProvider()).toThrow(/MISTRAL_API_KEY/);
  });

  it("throws on unknown AI_PROVIDER value (fail loud, no silent fallback)", () => {
    process.env.AI_PROVIDER = "llama";
    expect(() => getProvider()).toThrow(/AI_PROVIDER/);
  });
});

describe("OffProvider", () => {
  it("chat() throws descriptive error", async () => {
    const provider = createOffProvider();
    await expect(provider.chat({ system: "x", messages: [] })).rejects.toThrow(
      "AI provider is disabled (AI_PROVIDER=off). Set AI_PROVIDER to 'claude' or 'mistral' to enable.",
    );
  });

  it("chat() throws AIProviderError (nicht rohen Error)", async () => {
    const provider = createOffProvider();
    await expect(
      provider.chat({ system: "x", messages: [] }),
    ).rejects.toBeInstanceOf(AIProviderError);
  });

  it("has name 'off'", () => {
    expect(createOffProvider().name).toBe("off");
  });
});

describe("MockProvider", () => {
  it("has name 'mock'", () => {
    expect(createMockProvider().name).toBe("mock");
  });

  it("returns default response when queue empty", async () => {
    const provider = createMockProvider();
    const res = await provider.chat({ system: "sys", messages: [] });
    expect(res.text).toBe("mock response");
    expect(res.tool_calls).toEqual([]);
    expect(res.stop_reason).toBe("end_turn");
    expect(res.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
  });

  it("records each chat() input in .calls", async () => {
    const provider = createMockProvider();
    const input: AIChatInput = {
      system: "s1",
      messages: [{ role: "user", content: "hi" }],
    };
    await provider.chat(input);
    await provider.chat({ system: "s2", messages: [] });
    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[0]).toEqual(input);
    expect(provider.calls[1].system).toBe("s2");
  });

  it("reset() clears calls, queue and sticky response", async () => {
    const provider = createMockProvider();
    provider.setResponse({
      text: "sticky",
      tool_calls: [],
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    });
    await provider.chat({ system: "s", messages: [] });
    expect(provider.calls).toHaveLength(1);

    provider.reset();

    expect(provider.calls).toHaveLength(0);
    const afterReset = await provider.chat({ system: "s2", messages: [] });
    expect(afterReset.text).toBe("mock response"); // wieder Default, nicht "sticky"
  });

  it("returns scripted response via setResponse()", async () => {
    const provider = createMockProvider();
    const scripted: AIResponse = {
      text: "scripted",
      tool_calls: [],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    provider.setResponse(scripted);
    const res = await provider.chat({ system: "x", messages: [] });
    expect(res).toEqual(scripted);
  });

  it("returns scripted responses in queue order via setResponses()", async () => {
    const provider = createMockProvider();
    const r1: AIResponse = {
      text: "one",
      tool_calls: [],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    };
    const r2: AIResponse = {
      text: "two",
      tool_calls: [],
      stop_reason: "end_turn",
      usage: { input_tokens: 2, output_tokens: 2 },
    };
    provider.setResponses([r1, r2]);

    const a = await provider.chat({ system: "x", messages: [] });
    const b = await provider.chat({ system: "x", messages: [] });
    const c = await provider.chat({ system: "x", messages: [] });

    expect(a.text).toBe("one");
    expect(b.text).toBe("two");
    // Queue leer -> Default-Response
    expect(c.text).toBe("mock response");
  });
});

describe("ClaudeProvider", () => {
  it("has name 'claude'", () => {
    const provider = createClaudeProvider({ apiKey: "sk-test" });
    expect(provider.name).toBe("claude");
  });

  it("sends correct request shape (POST, URL, headers, body)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "hello" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 3, output_tokens: 2 },
        }),
        { status: 200 },
      ),
    );

    const provider = createClaudeProvider({
      apiKey: "sk-test",
      model: "claude-sonnet-4-6",
      fetchImpl: fetchMock,
    });

    await provider.chat({
      system: "you are helpful",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 512,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["content-type"]).toBe("application/json");

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(body.system).toBe("you are helpful");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(body.max_tokens).toBe(512);
  });

  it("uses default max_tokens=1024 when not provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const provider = createClaudeProvider({
      apiKey: "sk-test",
      fetchImpl: fetchMock,
    });
    await provider.chat({ system: "s", messages: [] });
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.max_tokens).toBe(1024);
  });

  it("parses text-only response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "hello there" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 4, output_tokens: 7 },
        }),
        { status: 200 },
      ),
    );
    const provider = createClaudeProvider({
      apiKey: "sk-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({ system: "s", messages: [] });
    expect(res.text).toBe("hello there");
    expect(res.tool_calls).toEqual([]);
    expect(res.stop_reason).toBe("end_turn");
    expect(res.usage).toEqual({ input_tokens: 4, output_tokens: 7 });
  });

  it("parses tool_use response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            { type: "text", text: "let me check" },
            {
              type: "tool_use",
              id: "tool_1",
              name: "lookup_user",
              input: { id: 42 },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 10, output_tokens: 3 },
        }),
        { status: 200 },
      ),
    );
    const provider = createClaudeProvider({
      apiKey: "sk-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({
      system: "s",
      messages: [],
      tools: [
        {
          name: "lookup_user",
          description: "Lookup",
          input_schema: {
            type: "object",
            properties: { id: { type: "number" } },
          },
        },
      ],
    });
    expect(res.text).toBe("let me check");
    expect(res.tool_calls).toEqual([
      { name: "lookup_user", input: { id: 42 } },
    ]);
    expect(res.stop_reason).toBe("tool_use");
  });

  it("maps unknown stop_reason to 'other'", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "x" }],
          stop_reason: "pause_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const provider = createClaudeProvider({
      apiKey: "sk-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({ system: "s", messages: [] });
    expect(res.stop_reason).toBe("other");
  });

  it("throws AIProviderError on non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "rate limited" } }), {
        status: 429,
      }),
    );
    const provider = createClaudeProvider({
      apiKey: "sk-test",
      fetchImpl: fetchMock,
    });
    await expect(provider.chat({ system: "s", messages: [] })).rejects.toThrow(
      AIProviderError,
    );
    await expect(provider.chat({ system: "s", messages: [] })).rejects.toThrow(
      /429/,
    );
  });

  it("passes tools through in request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const provider = createClaudeProvider({
      apiKey: "sk-test",
      fetchImpl: fetchMock,
    });
    await provider.chat({
      system: "s",
      messages: [],
      tools: [
        {
          name: "foo",
          description: "bar",
          input_schema: { type: "object", properties: {} },
        },
      ],
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.tools).toEqual([
      {
        name: "foo",
        description: "bar",
        input_schema: { type: "object", properties: {} },
      },
    ]);
  });
});

describe("MistralProvider", () => {
  it("has name 'mistral'", () => {
    const provider = createMistralProvider({ apiKey: "m-test" });
    expect(provider.name).toBe("mistral");
  });

  it("sends correct request shape (POST, URL, headers, body incl. system role)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "hi" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        }),
        { status: 200 },
      ),
    );

    const provider = createMistralProvider({
      apiKey: "m-test",
      model: "mistral-medium-latest",
      fetchImpl: fetchMock,
    });

    await provider.chat({
      system: "you are helpful",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 256,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer m-test");
    expect(headers["content-type"]).toBe("application/json");

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("mistral-medium-latest");
    expect(body.max_tokens).toBe(256);
    // System als erste Message mit role=system
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "you are helpful",
    });
    expect(body.messages[1]).toEqual({ role: "user", content: "hi" });
  });

  it("parses text-only response (stop -> end_turn)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "hello" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 4, completion_tokens: 7 },
        }),
        { status: 200 },
      ),
    );
    const provider = createMistralProvider({
      apiKey: "m-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({ system: "s", messages: [] });
    expect(res.text).toBe("hello");
    expect(res.tool_calls).toEqual([]);
    expect(res.stop_reason).toBe("end_turn");
    expect(res.usage).toEqual({ input_tokens: 4, output_tokens: 7 });
  });

  it("parses tool_calls response (tool_calls -> tool_use)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "lookup_user",
                      arguments: JSON.stringify({ id: 42 }),
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 3 },
        }),
        { status: 200 },
      ),
    );
    const provider = createMistralProvider({
      apiKey: "m-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({
      system: "s",
      messages: [],
      tools: [
        {
          name: "lookup_user",
          description: "Lookup",
          input_schema: { type: "object", properties: {} },
        },
      ],
    });
    expect(res.text).toBe("");
    expect(res.tool_calls).toEqual([
      { name: "lookup_user", input: { id: 42 } },
    ]);
    expect(res.stop_reason).toBe("tool_use");
  });

  it("maps finish_reason length -> max_tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "truncated" },
              finish_reason: "length",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const provider = createMistralProvider({
      apiKey: "m-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({ system: "s", messages: [] });
    expect(res.stop_reason).toBe("max_tokens");
  });

  it("maps unknown finish_reason -> other", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "x" },
              finish_reason: "content_filter",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const provider = createMistralProvider({
      apiKey: "m-test",
      fetchImpl: fetchMock,
    });
    const res = await provider.chat({ system: "s", messages: [] });
    expect(res.stop_reason).toBe("other");
  });

  it("throws AIProviderError on non-2xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "bad" }), { status: 500 }),
      );
    const provider = createMistralProvider({
      apiKey: "m-test",
      fetchImpl: fetchMock,
    });
    await expect(provider.chat({ system: "s", messages: [] })).rejects.toThrow(
      AIProviderError,
    );
    await expect(provider.chat({ system: "s", messages: [] })).rejects.toThrow(
      /500/,
    );
  });

  it("passes tools in OpenAI function-calling shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { status: 200 },
      ),
    );
    const provider = createMistralProvider({
      apiKey: "m-test",
      fetchImpl: fetchMock,
    });
    await provider.chat({
      system: "s",
      messages: [],
      tools: [
        {
          name: "foo",
          description: "bar",
          input_schema: {
            type: "object",
            properties: { x: { type: "number" } },
          },
        },
      ],
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.tools).toEqual([
      {
        type: "function",
        function: {
          name: "foo",
          description: "bar",
          parameters: {
            type: "object",
            properties: { x: { type: "number" } },
          },
        },
      },
    ]);
  });
});

describe("AIProviderError", () => {
  it("carries provider name and is an Error instance", () => {
    const err = new AIProviderError("claude", "boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.provider).toBe("claude");
    expect(err.message).toBe("boom");
    expect(err.name).toBe("AIProviderError");
  });
});
