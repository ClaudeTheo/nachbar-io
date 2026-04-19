// app/api/ai/onboarding/turn/route.ts
// C5b — Onboarding-Wizard-Turn fuer die Senior-App.
//
// Ein Turn besteht aus: Client schickt vorherige History + neuen userInput,
// die Route baut den System-Prompt aus dem Wissensdokument (C3) plus einem
// Memory-Block (loadMemoryContext) und ruft den konfigurierten AI-Provider
// (C2) auf. Tool-Calls (save_memory, C4) werden serverseitig ausgefuehrt und
// das Ergebnis kommt strukturiert zum Client zurueck. Stateless - der Client
// ist fuer die Persistenz der Conversation verantwortlich.
//
// AVV-Blocker: Solange AI_PROVIDER=off oder noch nicht gesigned, antwortet
// die Route mit 503. Kein Silent-Fallback.

import type { NextRequest } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/care/api-helpers";
import {
  getProvider,
  AIProviderError,
  type AIMessage,
  type AIToolCall,
} from "@/lib/ai/provider";
import { loadMemoryContext } from "@/modules/memory/services/memory-loader";
import { buildMemoryTool } from "@/modules/memory/services/chat-integration";
import {
  saveMemoryToolHandler,
  type SaveMemoryResult,
} from "@/lib/ai/tools/save-memory";
import { loadSeniorAppKnowledge } from "@/lib/ai/system-prompts/loader";

// Max Tool-Calls pro Turn. Schuetzt vor Runaway wenn der Provider
// unerwartet viele save_memory-Calls in einer Response emittiert.
const MAX_TOOLS_PER_TURN = 3;
// Max Token fuer Assistant-Output. Der System-Prompt selbst ist wesentlich
// groesser, wird aber via system_cached nur alle 5 Minuten neu abgerechnet.
const MAX_TOKENS = 1024;

interface TurnRequest {
  messages: AIMessage[];
  userInput: string;
}

function parseRequest(
  body: unknown,
): { ok: true; data: TurnRequest } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const raw = body as Record<string, unknown>;

  const messages = raw["messages"];
  if (!Array.isArray(messages)) {
    return { ok: false, message: "messages must be an array" };
  }
  // Minimal-Validation der Message-Shapes - volle Schema-Validation uebernimmt
  // der Provider-Adapter. Hier nur Role+Content-Typ.
  for (const [i, m] of messages.entries()) {
    if (typeof m !== "object" || m === null) {
      return { ok: false, message: `messages[${i}] must be an object` };
    }
    const msg = m as Record<string, unknown>;
    if (msg["role"] !== "user" && msg["role"] !== "assistant") {
      return {
        ok: false,
        message: `messages[${i}].role must be 'user' or 'assistant'`,
      };
    }
    if (typeof msg["content"] !== "string") {
      return { ok: false, message: `messages[${i}].content must be a string` };
    }
  }

  const userInput = raw["userInput"];
  if (typeof userInput !== "string" || userInput.trim().length === 0) {
    return { ok: false, message: "userInput must be a non-empty string" };
  }

  return {
    ok: true,
    data: {
      messages: messages as AIMessage[],
      userInput,
    },
  };
}

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();
  const { supabase, user } = auth;

  // 2. Request-Body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request-Body (JSON)", 400);
  }
  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return errorResponse(parsed.message, 400);
  }
  const { messages, userInput } = parsed.data;

  // 3. Memory-Kontext laden (relevant fuer den neuen userInput)
  let memoryBlock = "";
  try {
    memoryBlock = await loadMemoryContext(
      supabase,
      user.id,
      userInput,
      "plus_chat",
    );
  } catch (err) {
    // Fallback: Chat laeuft auch ohne Memory-Block weiter.
    console.warn(
      "[ai/onboarding/turn] loadMemoryContext-Fehler, Fallback ohne Memory:",
      err,
    );
  }

  // 4. System-Prompt bauen (Wissensdokument + Memory-Block)
  const knowledge = await loadSeniorAppKnowledge();
  const systemPrompt = memoryBlock
    ? `${knowledge}\n\n${memoryBlock}`
    : knowledge;

  // 5. Provider holen - bei AI_PROVIDER=off wird hier geworfen
  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    if (err instanceof AIProviderError) {
      return errorResponse("KI-Assistent ist deaktiviert (ai_disabled)", 503);
    }
    throw err;
  }

  // 6. Chat-Call
  const chatMessages: AIMessage[] = [
    ...messages,
    { role: "user", content: userInput },
  ];

  let response;
  try {
    response = await provider.chat({
      system: systemPrompt,
      system_cached: true, // C5a: 5min-Cache fuer -90% Input-Kosten
      messages: chatMessages,
      tools: [buildMemoryTool()],
      max_tokens: MAX_TOKENS,
    });
  } catch (err) {
    if (err instanceof AIProviderError) {
      return errorResponse(
        "KI-Assistent ist gerade nicht erreichbar (ai_disabled)",
        503,
      );
    }
    throw err;
  }

  // 7. Tool-Calls ausfuehren (wenn vorhanden und innerhalb des Limits)
  const toolCalls: AIToolCall[] = response.tool_calls ?? [];
  if (toolCalls.length > MAX_TOOLS_PER_TURN) {
    return errorResponse(
      `Zu viele Tool-Calls in einem Turn (Limit ${MAX_TOOLS_PER_TURN}, erhalten ${toolCalls.length}). Verdacht auf Tool-Loop-Overflow.`,
      500,
    );
  }

  const toolResults: SaveMemoryResult[] = [];
  for (const call of toolCalls) {
    // Welle C: nur save_memory ist serverseitig erlaubt. Andere Tool-Namen
    // werden hier hart abgewiesen, ohne in den Memory-Handler zu laufen.
    if (call.name !== "save_memory") {
      toolResults.push({
        ok: false,
        reason: "validation_error",
        message: `unknown tool: ${call.name}`,
      });
      continue;
    }
    const result = await saveMemoryToolHandler(call, {
      actor: { userId: user.id, role: "senior" },
      targetUserId: user.id,
      supabase,
    });
    toolResults.push(result);
  }

  // 8. Response
  return Response.json({
    assistant_text: response.text,
    tool_results: toolResults,
    stop_reason: response.stop_reason,
  });
}
