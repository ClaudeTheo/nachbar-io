// components/companion/CompanionChat.tsx
// Messenger-artige Chat-UI fuer den KI-Quartier-Lotsen
// Nachrichten werden in React-State gehalten (kein DB), Session-Persistenz via sessionStorage

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createSpeechEngine } from '@/lib/voice/create-speech-engine';
import type { SpeechEngine, SpeechEngineState } from '@/lib/voice/speech-engine';
import { ActionCard } from './ActionCard';
import { ConfirmationCard } from './ConfirmationCard';
import { TTSButton } from './TTSButton';

// --- Typen ---

/** Tool-Ergebnis vom Backend */
interface ToolResult {
  tool: string;
  summary: string;
  success: boolean;
}

/** Tool-Bestaetigung (Write-Aktion) */
interface ToolConfirmation {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

/** Chat-Nachricht (lokal, nicht in DB) */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolResults?: ToolResult[];
  confirmations?: ToolConfirmation[];
  timestamp: number;
}

/** API-Antwort von /api/companion/chat */
interface ChatResponse {
  message: string;
  toolResults?: ToolResult[];
  confirmations?: ToolConfirmation[];
}

// SessionStorage-Key
const SESSION_KEY = 'companion-chat-messages';

// Willkommensnachricht
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hallo! Ich bin Ihr KI-Assistent fuer das Quartier. Wie kann ich Ihnen helfen?',
  timestamp: Date.now(),
};

/** Eindeutige ID generieren */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nachrichten aus sessionStorage laden */
function loadMessages(): ChatMessage[] {
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
function saveMessages(msgs: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs));
  } catch {
    // Storage voll — ignorieren
  }
}

export function CompanionChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechEngineState>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<SpeechEngine | null>(null);

  // SessionStorage beim Mount laden
  useEffect(() => {
    const loaded = loadMessages();
    setMessages(loaded);
  }, []);

  // Nachrichten in sessionStorage persistieren
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Speech Engine initialisieren
  useEffect(() => {
    engineRef.current = createSpeechEngine();
    return () => {
      engineRef.current?.cleanup();
    };
  }, []);

  // Auto-Scroll zum letzten Element (scrollIntoView nur wenn verfuegbar, z.B. nicht in jsdom)
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- Chat senden ---
  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? inputValue).trim();
    if (!content || sending) return;

    setInputValue('');
    setSending(true);

    // User-Nachricht hinzufuegen
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      // Nachrichten-History fuer API vorbereiten (nur role + content)
      const apiMessages = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error(`Fehler: ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      // KI-Antwort als Nachricht hinzufuegen
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.message || '',
        toolResults: data.toolResults,
        confirmations: data.confirmations,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error('Verbindungsfehler. Bitte versuchen Sie es erneut.');

      // Fehlernachricht vom Assistenten
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Entschuldigung, es gab einen Verbindungsfehler. Bitte versuchen Sie es erneut.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setSending(false);
  }, [inputValue, sending, messages]);

  // --- Tool-Bestaetigung ---
  const handleConfirmTool = useCallback(async (confirmation: ToolConfirmation, msgId: string) => {
    setConfirmLoading(msgId);

    try {
      // Letzte Nachrichten fuer Kontext
      const apiMessages = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          confirmTool: { tool: confirmation.tool, params: confirmation.params },
        }),
      });

      if (!res.ok) throw new Error(`Fehler: ${res.status}`);

      const data: ChatResponse = await res.json();

      // Bestaetigungsnachricht entfernen und Ergebnis hinzufuegen
      setMessages((prev) => {
        // Bestaetigung aus der Nachricht entfernen
        const updated = prev.map((m) => {
          if (m.id === msgId && m.confirmations) {
            return {
              ...m,
              confirmations: m.confirmations.filter((c) => c.tool !== confirmation.tool),
            };
          }
          return m;
        });

        // Ergebnis-Nachricht hinzufuegen
        const resultMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: data.message || 'Aktion ausgefuehrt.',
          toolResults: data.toolResults,
          timestamp: Date.now(),
        };

        return [...updated, resultMsg];
      });
    } catch {
      toast.error('Aktion konnte nicht ausgefuehrt werden.');
    }

    setConfirmLoading(null);
  }, [messages]);

  // --- Tool-Abbruch ---
  const handleCancelTool = useCallback((confirmation: ToolConfirmation, msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.confirmations) {
          return {
            ...m,
            confirmations: m.confirmations.filter((c) => c.tool !== confirmation.tool),
          };
        }
        return m;
      })
    );
    toast('Aktion abgebrochen.');
  }, []);

  // --- Spracheingabe ---
  const toggleRecording = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      toast.error('Spracheingabe ist in Ihrem Browser nicht verfuegbar.');
      return;
    }

    if (recording) {
      // Stoppen
      engine.stopListening();
      setRecording(false);
      setSpeechState('idle');
    } else {
      // Starten
      setRecording(true);
      engine.startListening({
        onTranscript: (text) => {
          setRecording(false);
          setSpeechState('idle');
          // Direkt senden
          if (text.trim()) {
            handleSend(text.trim());
          }
        },
        onAudioLevel: () => {
          // Fuer spaeter: Waveform-Visualisierung
        },
        onStateChange: (state) => {
          setSpeechState(state);
          if (state === 'idle') {
            setRecording(false);
          }
        },
        onError: (msg) => {
          setRecording(false);
          setSpeechState('idle');
          toast.error(msg || 'Spracherkennung fehlgeschlagen.');
        },
      });
    }
  }, [recording, handleSend]);

  // Enter zum Senden (Shift+Enter fuer Zeilenumbruch)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex h-full flex-col" data-testid="companion-chat">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-quartier-green/10">
          <Bot className="h-5 w-5 text-quartier-green" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-anthrazit">Quartier-Lotse</h1>
          <p className="text-xs text-muted-foreground">KI-Assistent fuer Ihr Quartier</p>
        </div>
      </div>

      {/* Nachrichten-Bereich */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Nachrichten-Blase */}
                  <div
                    data-testid="chat-message"
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      isUser
                        ? 'bg-quartier-green text-white'
                        : 'border border-border bg-white text-anthrazit'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {/* Tool-Ergebnisse (nur KI-Nachrichten) */}
                  {!isUser && msg.toolResults?.map((result, i) => (
                    <ActionCard
                      key={`${msg.id}-tool-${i}`}
                      tool={result.tool}
                      summary={result.summary}
                      success={result.success}
                    />
                  ))}

                  {/* Bestaetigungskarten (nur KI-Nachrichten) */}
                  {!isUser && msg.confirmations?.map((conf, i) => (
                    <ConfirmationCard
                      key={`${msg.id}-conf-${i}`}
                      tool={conf.tool}
                      summary={conf.description}
                      onConfirm={() => handleConfirmTool(conf, msg.id)}
                      onCancel={() => handleCancelTool(conf, msg.id)}
                      loading={confirmLoading === msg.id}
                    />
                  ))}

                  {/* TTS-Button + Zeitstempel (nur KI-Nachrichten) */}
                  {!isUser && msg.content && (
                    <div className="mt-1 flex items-center gap-2">
                      <TTSButton text={msg.content} />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* Zeitstempel (User-Nachrichten) */}
                  {isUser && (
                    <p className="mr-3 mt-1 text-right text-[11px] text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Tipp-Indikator waehrend KI arbeitet */}
          {sending && (
            <div className="flex justify-start" data-testid="typing-indicator">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-quartier-green" />
                <span className="text-sm text-muted-foreground">Quartier-Lotse denkt nach...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Aufnahme-Indikator */}
      {recording && (
        <div
          data-testid="recording-indicator"
          className="flex items-center justify-center gap-2 border-t border-border bg-red-50 px-4 py-2"
        >
          <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-700">
            {speechState === 'processing' ? 'Verarbeite...' : 'Ich hoere zu...'}
          </span>
        </div>
      )}

      {/* Eingabefeld */}
      <div className="border-t border-border bg-warmwhite px-4 pt-3 pb-4">
        <div className="flex items-end gap-2">
          {/* Mikrofon-Button */}
          <Button
            data-testid="companion-mic"
            onClick={toggleRecording}
            size="icon"
            variant={recording ? 'destructive' : 'outline'}
            className={`h-11 w-11 shrink-0 rounded-full ${
              recording ? '' : 'border-border text-muted-foreground hover:text-quartier-green'
            }`}
            aria-label={recording ? 'Aufnahme stoppen' : 'Spracheingabe'}
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Text-Eingabe */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Fragen Sie den Quartier-Lotsen..."
            data-testid="companion-input"
            rows={1}
            maxLength={1000}
            disabled={sending}
            className="flex-1 resize-none rounded-2xl border border-border bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green disabled:opacity-50"
            style={{ minHeight: '2.75rem', maxHeight: '7rem' }}
            onInput={(e) => {
              // Auto-Resize
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 112) + 'px';
            }}
          />

          {/* Senden-Button */}
          <Button
            onClick={() => handleSend()}
            disabled={sending || !inputValue.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full bg-quartier-green hover:bg-quartier-green/90 disabled:opacity-40"
            aria-label="Nachricht senden"
            data-testid="companion-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
