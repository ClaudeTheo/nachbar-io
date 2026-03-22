// app/api/companion/chat/route.ts
// Nachbar.io — Companion Chat API: Claude-basierter Quartier-Lotse mit Tool Use

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, errorResponse } from '@/lib/care/api-helpers';
import { loadQuarterContext } from '@/lib/companion/context-loader';
import { buildSystemPrompt } from '@/lib/companion/system-prompt';
import { companionTools } from '@/lib/companion/tools';
import { isWriteTool, executeCompanionTool } from '@/lib/companion/tool-executor';
import type { ToolResult } from '@/lib/companion/tool-executor';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

/** Maximale Anzahl an Nachrichten im Session-Gedaechtnis */
const MAX_MESSAGES = 20;

/** Chat-Nachricht vom Client */
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Anfrage-Body */
interface ChatRequest {
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

// POST /api/companion/chat — Chat mit dem Quartier-Lotsen
export async function POST(request: NextRequest) {
  // Auth: Nur angemeldete Nutzer
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  // Body parsen
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Ungueltiger Request-Body.', 400);
  }

  const { messages, stream, confirmTool } = body;

  // Validierung: mindestens eine Nachricht
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse('Keine Nachrichten angegeben.', 400);
  }

  try {
    const userId = auth.user.id;

    // Tool-Bestaetigung ausfuehren (wenn vorhanden)
    // Bei Bestaetigung: Tool direkt ausfuehren und Ergebnis zurueckgeben
    // KEIN erneuter Claude-Call noetig — spart Latenz und verhindert doppelte Tool-Calls
    if (confirmTool?.tool && confirmTool?.params) {
      const confirmResult = await executeCompanionTool(confirmTool.tool, confirmTool.params, userId);
      const confirmMessage = confirmResult.success
        ? confirmResult.summary
        : `Leider ist ein Fehler aufgetreten: ${confirmResult.summary}`;

      return NextResponse.json({
        message: confirmMessage,
        toolResults: [confirmResult],
      });
    }

    // Quartier-Kontext laden (parallel zur Message-Validierung)
    const contextPromise = loadQuarterContext(userId);

    // Nachrichten auf die letzten MAX_MESSAGES begrenzen (Session-Gedaechtnis)
    const recentMessages = messages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Context-Promise awaiten und System-Prompt bauen
    const context = await contextPromise;
    const systemPrompt = buildSystemPrompt(context);

    // Streaming-Modus: SSE-Response mit ReadableStream
    if (stream) {
      return await handleStreamingResponse(systemPrompt, recentMessages, userId);
    }

    // Nicht-Streaming: Bisherige JSON-Response (Backwards-Kompatibilitaet)
    return await handleJsonResponse(systemPrompt, recentMessages, userId);
  } catch (err) {
    console.error('[companion/chat] KI-Fehler:', err);
    return errorResponse('KI-Fehler', 500);
  }
}

/**
 * Streaming-Response: SSE-Events fuer Text-Deltas, Tool-Results und Done.
 */
async function handleStreamingResponse(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId: string
): Promise<Response> {
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const anthropic = new Anthropic();
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 768,
          system: systemPrompt,
          tools: companionTools,
          messages,
        });

        let fullReply = '';
        let toolInputJson = '';
        let currentToolName = '';

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              // Text-Delta an Client senden
              fullReply += event.delta.text;
              const sseEvent = `event: text\ndata: ${JSON.stringify({ delta: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(sseEvent));
            } else if (event.delta.type === 'input_json_delta') {
              // Tool-Input JSON-Chunks sammeln
              toolInputJson += event.delta.partial_json;
            }
          } else if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
            // Neuer Tool-Block beginnt
            currentToolName = event.content_block.name;
            toolInputJson = '';
          } else if (event.type === 'content_block_stop' && currentToolName) {
            // Tool-Block fertig — Tool ausfuehren
            try {
              const toolParams = toolInputJson ? JSON.parse(toolInputJson) : {};
              if (isWriteTool(currentToolName)) {
                // Write-Tool: Bestaetigung senden
                const sseEvent = `event: confirmation\ndata: ${JSON.stringify({
                  tool: currentToolName,
                  params: toolParams,
                  description: formatToolDescription(currentToolName, toolParams),
                })}\n\n`;
                controller.enqueue(encoder.encode(sseEvent));
              } else {
                // Read-Tool: Sofort ausfuehren
                const result = await executeCompanionTool(currentToolName, toolParams, userId);
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
              console.error(`[companion/chat] Tool-Fehler (${currentToolName}):`, toolErr);
            }
            currentToolName = '';
            toolInputJson = '';
          } else if (event.type === 'message_stop') {
            // Stream beendet
            const doneEvent = `event: done\ndata: ${JSON.stringify({ full_reply: fullReply })}\n\n`;
            controller.enqueue(encoder.encode(doneEvent));
          }
        }
      } catch (err) {
        console.error('[companion/chat] Streaming-Fehler:', err);
        const errorEvent = `event: error\ndata: ${JSON.stringify({ message: 'KI-Fehler' })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Nicht-Streaming JSON-Response (Backwards-Kompatibilitaet).
 */
async function handleJsonResponse(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId: string
): Promise<NextResponse> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    system: systemPrompt,
    tools: companionTools,
    messages,
  });

  // Antwort verarbeiten: Text, Tool-Results und Bestaetigungen extrahieren
  let message = '';
  const toolResults: ToolResult[] = [];
  const confirmations: ToolConfirmation[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      message += block.text;
    } else if (block.type === 'tool_use') {
      const toolName = block.name;
      const toolParams = (block.input as Record<string, unknown>) ?? {};

      if (isWriteTool(toolName)) {
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
    message = 'Ich konnte Ihre Anfrage leider nicht verarbeiten. Bitte versuchen Sie es erneut.';
  }

  const responseBody: Record<string, unknown> = { message };
  if (toolResults.length > 0) responseBody.toolResults = toolResults;
  if (confirmations.length > 0) responseBody.confirmations = confirmations;

  return NextResponse.json(responseBody);
}

/**
 * Erstellt eine benutzerfreundliche Beschreibung fuer eine Tool-Bestaetigung.
 */
function formatToolDescription(toolName: string, params: Record<string, unknown>): string {
  switch (toolName) {
    case 'create_bulletin_post':
      return `Beitrag "${params.title}" auf dem Schwarzen Brett veroeffentlichen`;
    case 'create_help_request':
      return `Hilfsanfrage "${params.title}" erstellen`;
    case 'create_event':
      return `Veranstaltung "${params.title}" am ${params.date} erstellen`;
    case 'report_issue':
      return `Maengelmeldung erstellen: ${(params.description as string)?.slice(0, 80)}`;
    case 'create_marketplace_listing':
      return `Inserat "${params.title}" auf dem Marktplatz erstellen`;
    case 'update_help_offers':
      return `Hilfsangebote aktualisieren`;
    case 'send_message':
      return `Nachricht an "${params.recipient_name}" senden`;
    case 'update_profile':
      return `Profil aktualisieren`;
    case 'create_meal':
      return `Mitess-Angebot "${params.title}" erstellen`;
    default:
      return `${toolName} ausfuehren`;
  }
}
