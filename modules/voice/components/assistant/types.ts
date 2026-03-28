// components/voice-assistant/types.ts
// Nachbar.io — Gemeinsame Typen fuer den Voice-Assistenten

/** Sheet-Zustaende */
export type SheetState =
  | "closed"
  | "idle"
  | "recording"
  | "processing"
  | "speaking"
  | "result"
  | "error";

/** Chat-Nachricht fuer den Companion */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Tool-Ergebnis vom Companion */
export interface CompanionToolResult {
  success: boolean;
  summary: string;
  data?: unknown;
  route?: string;
}

/** Tool-Bestaetigung (Write-Tool) */
export interface CompanionConfirmation {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

/** Antwort vom /api/companion/chat Endpoint */
export interface CompanionResponse {
  message: string;
  toolResults?: CompanionToolResult[];
  confirmations?: CompanionConfirmation[];
}

/** Maximale Anzahl an Austauschen bevor "Zum Quartier-Lotsen"-Hinweis */
export const MAX_EXCHANGES = 2;
