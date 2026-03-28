// components/companion/hooks/companion-chat-utils.ts
// Typen, Konstanten und Storage-Funktionen fuer den CompanionChat

import { createClient } from '@/lib/supabase/client';

// --- Typen (exportiert fuer Sub-Komponenten) ---

/** Tool-Ergebnis vom Backend */
export interface ToolResult {
  tool: string;
  summary: string;
  success: boolean;
  route?: string;
}

/** Tool-Bestaetigung (Write-Aktion) */
export interface ToolConfirmation {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

/** Chat-Nachricht (lokal, nicht in DB) */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: ToolResult[];
  confirmations?: ToolConfirmation[];
  timestamp: number;
}

/** API-Antwort von /api/companion/chat */
export interface ChatResponse {
  message: string;
  toolResults?: ToolResult[];
  confirmations?: ToolConfirmation[];
}

// SessionStorage-Key
const SESSION_KEY = 'companion-chat-messages';

/** Willkommensnachricht */
export const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hallo! Ich bin Ihr KI-Assistent für das Quartier. Wie kann ich Ihnen helfen?',
  timestamp: Date.now(),
};

/** Eindeutige ID generieren */
export function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nachrichten aus sessionStorage laden */
export function loadMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [WELCOME_MESSAGE];
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[];
      return parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
    }
  } catch {
    // Bei Fehler: frische Session
  }
  return [WELCOME_MESSAGE];
}

/** Nachrichten in sessionStorage speichern */
export function saveMessages(msgs: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs));
  } catch {
    // Storage voll — ignorieren
  }
}

/** Max 20 Nachrichten in Supabase persistieren (Upsert) */
export async function persistToSupabase(userId: string, msgs: ChatMessage[]) {
  try {
    const supabase = createClient();
    const toStore = msgs.filter(m => m.id !== 'welcome').slice(-20);
    await supabase
      .from('companion_chat_history')
      .upsert({
        user_id: userId,
        messages: toStore,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch (err) {
    console.warn('[CompanionChat] Supabase-Persist fehlgeschlagen:', err);
  }
}

/** Nachrichten aus Supabase laden */
export async function loadFromSupabase(userId: string): Promise<ChatMessage[] | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('companion_chat_history')
      .select('messages')
      .eq('user_id', userId)
      .single();

    if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
      return [WELCOME_MESSAGE, ...(data.messages as ChatMessage[])];
    }
  } catch {
    // Kein Eintrag oder Fehler
  }
  return null;
}
