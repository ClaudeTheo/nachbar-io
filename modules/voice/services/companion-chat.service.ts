// Nachbar.io — Companion Chat Service
// Business-Logik fuer den Claude-basierten Quartier-Lotsen mit Tool Use + Memory

import { ServiceError } from "@/lib/services/service-error";
import { loadQuarterContext } from "@/modules/voice/services/context-loader";
import { buildSystemPrompt } from "@/modules/voice/services/system-prompt";
import { companionTools } from "@/modules/voice/services/tools";
import {
  isWriteTool,
  executeCompanionTool,
} from "@/modules/voice/services/tool-executor";
import type { ToolResult } from "@/modules/voice/services/tool-executor";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMemoryContext } from "@/modules/memory/services/memory-loader";
import {
  buildMemoryTool,
  processMemoryToolCall,
} from "@/modules/memory/services/chat-integration";
import {
  saveFact,
  getFactCount,
} from "@/modules/memory/services/facts.service";
import { hasConsent } from "@/modules/memory/services/consent.service";
import {
  SENSITIVE_CATEGORIES,
  MEMORY_LIMITS,
  CATEGORY_TO_CONSENT,
} from "@/modules/memory/types";
import type { MemorySaveProposal } from "@/modules/memory/types";

/** Maximale Anzahl an Nachrichten im Session-Gedaechtnis */
const MAX_MESSAGES = 20;

/** Chat-Nachricht vom Client */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Anfrage-Body */
export interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
  confirmTool?: { tool: string; params: Record<string, unknown> };
}

/** Tool-Bestaetigung fuer Write-Tools (an Client zurueck) */
interface ToolConfirmation {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

/**
 * Validiert den Request-Body und gibt die geparseten Daten zurueck.
 */
export function parseAndValidateRequest(body: ChatRequest): ChatRequest {
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ServiceError("Keine Nachrichten angegeben.", 400);
  }
  return body;
}

/**
 * Fuehrt eine bestaetigte Tool-Aktion direkt aus (ohne erneuten Claude-Call).
 */
export async function handleToolConfirmation(
  confirmTool: { tool: string; params: Record<string, unknown> },
  userId: string,
): Promise<Record<string, unknown>> {
  const confirmResult = await executeCompanionTool(
    confirmTool.tool,
    confirmTool.params,
    userId,
  );
  const confirmMessage = confirmResult.success
    ? confirmResult.summary
    : `Leider ist ein Fehler aufgetreten: ${confirmResult.summary}`;

  return {
    message: confirmMessage,
    toolResults: [
      {
        tool: confirmTool.tool,
        summary: confirmResult.summary,
        success: confirmResult.success,
        route: confirmResult.route,
      },
    ],
  };
}

/**
 * Streaming-Response: SSE-Events fuer Text-Deltas, Tool-Results und Done.
 */
export async function handleStreamingResponse(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userId: string,
  tools?: typeof companionTools,
  supabase?: SupabaseClient,
): Promise<Response> {
  const encoder = new TextEncoder();
  const activeTools = tools || companionTools;

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const anthropic = new Anthropic();
        const stream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 768,
          system: systemPrompt,
          tools: activeTools,
          messages,
        });

        let fullReply = "";
        let toolInputJson = "";
        let currentToolName = "";

        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              // Text-Delta an Client senden
              fullReply += event.delta.text;
              const sseEvent = `event: text\ndata: ${JSON.stringify({ delta: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(sseEvent));
            } else if (event.delta.type === "input_json_delta") {
              // Tool-Input JSON-Chunks sammeln
              toolInputJson += event.delta.partial_json;
            }
          } else if (
            event.type === "content_block_start" &&
            event.content_block.type === "tool_use"
          ) {
            // Neuer Tool-Block beginnt
            currentToolName = event.content_block.name;
            toolInputJson = "";
          } else if (event.type === "content_block_stop" && currentToolName) {
            // Tool-Block fertig — Tool ausfuehren
            try {
              const toolParams = toolInputJson ? JSON.parse(toolInputJson) : {};

              // save_memory Tool: Server-seitig verarbeiten
              if (currentToolName === "save_memory" && supabase) {
                const memResult = await handleSaveMemoryTool(
                  supabase,
                  userId,
                  toolParams as MemorySaveProposal,
                );
                if (memResult.needsConfirmation) {
                  const sseEvent = `event: confirmation\ndata: ${JSON.stringify(
                    {
                      tool: "save_memory",
                      params: toolParams,
                      description: memResult.result,
                    },
                  )}\n\n`;
                  controller.enqueue(encoder.encode(sseEvent));
                } else {
                  const sseEvent = `event: memory\ndata: ${JSON.stringify({
                    message: memResult.result,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(sseEvent));
                }
              } else if (isWriteTool(currentToolName)) {
                // Write-Tool: Bestaetigung senden
                const sseEvent = `event: confirmation\ndata: ${JSON.stringify({
                  tool: currentToolName,
                  params: toolParams,
                  description: formatToolDescription(
                    currentToolName,
                    toolParams,
                  ),
                })}\n\n`;
                controller.enqueue(encoder.encode(sseEvent));
              } else {
                // Read-Tool: Sofort ausfuehren
                const result = await executeCompanionTool(
                  currentToolName,
                  toolParams,
                  userId,
                );
                const sseEvent = `event: tool\ndata: ${JSON.stringify({
                  name: currentToolName,
                  result,
                })}\n\n`;
                controller.enqueue(encoder.encode(sseEvent));

                // Tool-Summary als Teil der Antwort wenn kein Text vorhanden
                if (!fullReply && result.summary) {
                  fullReply = result.summary;
                }
              }
            } catch (toolErr) {
              console.error(
                `[companion/chat] Tool-Fehler (${currentToolName}):`,
                toolErr,
              );
            }
            currentToolName = "";
            toolInputJson = "";
          } else if (event.type === "message_stop") {
            // Stream beendet
            const doneEvent = `event: done\ndata: ${JSON.stringify({ full_reply: fullReply })}\n\n`;
            controller.enqueue(encoder.encode(doneEvent));
          }
        }
      } catch (err) {
        console.error("[companion/chat] Streaming-Fehler:", err);
        const errorEvent = `event: error\ndata: ${JSON.stringify({ message: "KI-Fehler" })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Nicht-Streaming JSON-Response (Backwards-Kompatibilitaet).
 */
export async function handleJsonResponse(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userId: string,
  tools?: typeof companionTools,
  supabase?: SupabaseClient,
): Promise<Record<string, unknown>> {
  const activeTools = tools || companionTools;
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 768,
    system: systemPrompt,
    tools: activeTools,
    messages,
  });

  // Antwort verarbeiten: Text, Tool-Results und Bestaetigungen extrahieren
  let message = "";
  const toolResults: ToolResult[] = [];
  const confirmations: ToolConfirmation[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      message += block.text;
    } else if (block.type === "tool_use") {
      const toolName = block.name;
      const toolParams = (block.input as Record<string, unknown>) ?? {};

      // save_memory Tool: Server-seitig verarbeiten
      if (toolName === "save_memory" && supabase) {
        const memResult = await handleSaveMemoryTool(
          supabase,
          userId,
          toolParams as unknown as MemorySaveProposal,
        );
        if (memResult.needsConfirmation) {
          confirmations.push({
            tool: "save_memory",
            params: toolParams,
            description: memResult.result,
          });
        } else {
          toolResults.push({
            tool: "save_memory",
            summary: memResult.result,
            success: true,
          } as ToolResult);
        }
      } else if (isWriteTool(toolName)) {
        confirmations.push({
          tool: toolName,
          params: toolParams,
          description: formatToolDescription(toolName, toolParams),
        });
      } else {
        const result = await executeCompanionTool(toolName, toolParams, userId);
        toolResults.push(result);

        if (!message && result.summary) {
          message = result.summary;
        }
      }
    }
  }

  // Fallback-Nachricht wenn leer
  if (!message && toolResults.length === 0 && confirmations.length === 0) {
    message =
      "Ich konnte Ihre Anfrage leider nicht verarbeiten. Bitte versuchen Sie es erneut.";
  }

  const responseBody: Record<string, unknown> = { message };
  if (toolResults.length > 0) responseBody.toolResults = toolResults;
  if (confirmations.length > 0) responseBody.confirmations = confirmations;

  return responseBody;
}

/**
 * Ermittelt den AssistantContext fuer einen User (Plus vs Free).
 */
async function getAssistantContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<"plus_chat" | "free_chat"> {
  // PILOT_MODE: alle User sind Plus (spaeter Stripe-Check)
  // .trim() weil vercel env pull manchmal \n an Werte anhaengt
  const isPilot = process.env.PILOT_MODE?.trim() === "true";
  if (isPilot) return "plus_chat";

  // Pruefen ob Plus-Abo aktiv (via users-Tabelle oder Stripe)
  const { data } = await supabase
    .from("users")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  return data?.subscription_plan === "plus" ? "plus_chat" : "free_chat";
}

/**
 * Verarbeitet save_memory Tool-Calls von Claude.
 */
async function handleSaveMemoryTool(
  supabase: SupabaseClient,
  userId: string,
  toolInput: MemorySaveProposal,
): Promise<{ result: string; needsConfirmation: boolean }> {
  const isSensitive = SENSITIVE_CATEGORIES.includes(toolInput.category);
  const consentType = CATEGORY_TO_CONSENT[toolInput.category];
  const userHasConsent = await hasConsent(supabase, userId, consentType);
  const factCount = await getFactCount(supabase, userId, isSensitive);
  const maxFacts = isSensitive
    ? MEMORY_LIMITS.SENSITIVE_MAX
    : MEMORY_LIMITS.BASIS_MAX;

  const decision = processMemoryToolCall(toolInput, {
    hasConsent: userHasConsent,
    factCount,
    maxFacts,
  });

  if (!decision.allowed) {
    const reasons: Record<string, string> = {
      medical_blocked:
        "Das darf ich mir leider nicht merken (medizinische Inhalte).",
      no_consent: "Dafuer fehlt noch die Einwilligung.",
      limit_reached:
        "Das Gedaechtnis ist voll. Bitte loeschen Sie zuerst alte Eintraege.",
    };
    return {
      result:
        reasons[decision.reason || ""] ||
        "Das kann ich leider nicht speichern.",
      needsConfirmation: false,
    };
  }

  if (decision.mode === "confirm") {
    return {
      result: `Soll ich mir merken: "${toolInput.value}"?`,
      needsConfirmation: true,
    };
  }

  // Auto-Save
  await saveFact(supabase, {
    category: toolInput.category,
    key: toolInput.key,
    value: toolInput.value,
    source: "ai_learned",
    sourceUserId: userId,
    confidence: toolInput.confidence,
    confirmed: false,
  });

  return {
    result: `Ich merke mir: "${toolInput.value}"`,
    needsConfirmation: false,
  };
}

/**
 * Hauptfunktion: Verarbeitet den Chat-Request und gibt die Response zurueck.
 */
export async function processChat(
  body: ChatRequest,
  userId: string,
  supabase?: SupabaseClient,
): Promise<Response> {
  const { messages, stream, confirmTool } = parseAndValidateRequest(body);

  // Tool-Bestaetigung ausfuehren (wenn vorhanden)
  if (confirmTool?.tool && confirmTool?.params) {
    // save_memory Bestaetigung
    if (confirmTool.tool === "save_memory" && supabase) {
      const proposal = confirmTool.params as unknown as MemorySaveProposal;
      await saveFact(supabase, {
        category: proposal.category,
        key: proposal.key,
        value: proposal.value,
        source: "ai_learned",
        sourceUserId: userId,
        confidence: proposal.confidence,
        confirmed: true,
      });
      return Response.json({
        message: `Ich merke mir: "${proposal.value}"`,
        toolResults: [
          {
            tool: "save_memory",
            summary: `Gespeichert: ${proposal.value}`,
            success: true,
          },
        ],
      });
    }
    return Response.json(await handleToolConfirmation(confirmTool, userId));
  }

  // Quartier-Kontext und Memory-Kontext parallel laden
  const contextPromise = loadQuarterContext(userId);
  const lastUserMessage = messages[messages.length - 1]?.content || "";

  // Memory-Kontext laden (nur wenn Supabase-Client vorhanden)
  let memoryBlock = "";
  let assistantContext: "plus_chat" | "free_chat" = "free_chat";
  if (supabase) {
    assistantContext = await getAssistantContext(supabase, userId);
    if (assistantContext === "plus_chat") {
      memoryBlock = await loadMemoryContext(
        supabase,
        userId,
        lastUserMessage,
        assistantContext,
      );
    }
  }

  // Nachrichten auf die letzten MAX_MESSAGES begrenzen (Session-Gedaechtnis)
  const recentMessages = messages.slice(-MAX_MESSAGES).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Context-Promise awaiten und System-Prompt bauen
  const context = await contextPromise;
  let systemPrompt = buildSystemPrompt(context);

  // Memory-Block an System-Prompt anhaengen (Plus-User)
  if (memoryBlock) {
    systemPrompt += "\n\n" + memoryBlock;
  }

  // Tools: save_memory hinzufuegen fuer Plus-User
  const tools = [...companionTools];
  if (assistantContext === "plus_chat") {
    tools.push(buildMemoryTool() as (typeof tools)[number]);
  }

  // Streaming-Modus: SSE-Response mit ReadableStream
  if (stream) {
    return handleStreamingResponse(
      systemPrompt,
      recentMessages,
      userId,
      tools,
      supabase,
    );
  }

  // Nicht-Streaming: JSON-Response (Backwards-Kompatibilitaet)
  return Response.json(
    await handleJsonResponse(
      systemPrompt,
      recentMessages,
      userId,
      tools,
      supabase,
    ),
  );
}

/**
 * Erstellt eine benutzerfreundliche Beschreibung fuer eine Tool-Bestaetigung.
 */
function formatToolDescription(
  toolName: string,
  params: Record<string, unknown>,
): string {
  switch (toolName) {
    case "create_bulletin_post":
      return `Beitrag "${params.title}" auf dem Schwarzen Brett veröffentlichen`;
    case "create_help_request":
      return `Hilfsanfrage "${params.title}" erstellen`;
    case "create_event":
      return `Veranstaltung "${params.title}" am ${params.date} erstellen`;
    case "report_issue":
      return `Maengelmeldung erstellen: ${(params.description as string)?.slice(0, 80)}`;
    case "create_marketplace_listing":
      return `Inserat "${params.title}" auf dem Marktplatz erstellen`;
    case "update_help_offers":
      return `Hilfsangebote aktualisieren`;
    case "send_message":
      return `Nachricht an "${params.recipient_name}" senden`;
    case "update_profile":
      return `Profil aktualisieren`;
    case "create_meal":
      return `Mitess-Angebot "${params.title}" erstellen`;
    case "save_memory":
      return `Sich merken: "${(params.value as string)?.slice(0, 80)}"`;
    default:
      return `${toolName} ausführen`;
  }
}
