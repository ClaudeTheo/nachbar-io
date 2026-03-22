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

  const { messages, confirmTool } = body;

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

    // Quartier-Kontext laden und System-Prompt bauen
    const context = await loadQuarterContext(userId);
    const systemPrompt = buildSystemPrompt(context);

    // Nachrichten auf die letzten MAX_MESSAGES begrenzen (Session-Gedaechtnis)
    const recentMessages = messages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Claude Haiku aufrufen mit Tool Use
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      tools: companionTools,
      messages: recentMessages,
    });

    // Antwort verarbeiten: Text, Tool-Results und Bestaetigungen extrahieren
    let message = '';
    const toolResults: ToolResult[] = [];
    const confirmations: ToolConfirmation[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        // Text-Bloecke zusammenfuegen
        message += block.text;
      } else if (block.type === 'tool_use') {
        const toolName = block.name;
        const toolParams = (block.input as Record<string, unknown>) ?? {};

        if (isWriteTool(toolName)) {
          // Write-Tool: Bestaetigung anfordern, NICHT ausfuehren
          confirmations.push({
            tool: toolName,
            params: toolParams,
            description: formatToolDescription(toolName, toolParams),
          });
        } else {
          // Read-Tool: Sofort ausfuehren
          const result = await executeCompanionTool(toolName, toolParams, userId);
          toolResults.push(result);

          // Tool-Ergebnis in Nachricht integrieren wenn kein Text vorhanden
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

    // Antwort zusammenbauen
    const responseBody: Record<string, unknown> = { message };
    if (toolResults.length > 0) responseBody.toolResults = toolResults;
    if (confirmations.length > 0) responseBody.confirmations = confirmations;

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error('[companion/chat] KI-Fehler:', err);
    return errorResponse('KI-Fehler', 500);
  }
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
