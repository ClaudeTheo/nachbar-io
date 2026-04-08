// components/companion/ChatMessageList.tsx
// Nachrichten-Liste mit Auto-Scroll, Tool-Ergebnissen und Bestaetigungskarten

import { Loader2 } from "lucide-react";
import { ActionCard } from "./ActionCard";
import { ConfirmationCard } from "./ConfirmationCard";
import { TTSButton } from "./TTSButton";
import { StreamingTextDisplay } from "./StreamingTextDisplay";
import { Linkify } from "./Linkify";
import type { ChatMessage, ToolConfirmation } from "./hooks/useCompanionChat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  sending: boolean;
  confirmLoading: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onConfirmTool: (
    confirmation: ToolConfirmation,
    msgId: string,
  ) => Promise<void>;
  onCancelTool: (confirmation: ToolConfirmation, msgId: string) => void;
}

export function ChatMessageList({
  messages,
  isStreaming,
  streamingText,
  sending,
  confirmLoading,
  messagesEndRef,
  onConfirmTool,
  onCancelTool,
}: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${isUser ? "items-end" : "items-start"}`}
              >
                {/* Nachrichten-Blase (nur anzeigen wenn Text vorhanden) */}
                {msg.content && (
                  <div
                    data-testid="chat-message"
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      isUser
                        ? "bg-quartier-green text-white"
                        : "border border-border bg-white text-anthrazit"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      <Linkify text={msg.content} />
                    </p>
                  </div>
                )}

                {/* Tool-Ergebnisse (nur KI-Nachrichten) */}
                {!isUser &&
                  msg.toolResults?.map((result, i) => (
                    <ActionCard
                      key={`${msg.id}-tool-${i}`}
                      tool={result.tool}
                      summary={result.summary}
                      success={result.success}
                    />
                  ))}

                {/* Bestaetigungskarten (nur KI-Nachrichten) */}
                {!isUser &&
                  msg.confirmations?.map((conf, i) => (
                    <ConfirmationCard
                      key={`${msg.id}-conf-${i}`}
                      tool={conf.tool}
                      summary={conf.description}
                      onConfirm={() => onConfirmTool(conf, msg.id)}
                      onCancel={() => onCancelTool(conf, msg.id)}
                      loading={confirmLoading === msg.id}
                    />
                  ))}

                {/* TTS-Button + Zeitstempel (nur KI-Nachrichten) */}
                {!isUser && msg.content && (
                  <div className="mt-1 flex items-center gap-2">
                    <TTSButton text={msg.content} />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {/* Zeitstempel (User-Nachrichten) */}
                {isUser && (
                  <p className="mr-3 mt-1 text-right text-[11px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming-Antwort waehrend KI antwortet */}
        {isStreaming && streamingText && (
          <div className="flex justify-start" data-testid="streaming-message">
            <div className="max-w-[85%] rounded-2xl border border-border bg-white px-4 py-3 text-sm text-anthrazit">
              <StreamingTextDisplay text={streamingText} isStreaming={true} />
            </div>
          </div>
        )}

        {/* Tipp-Indikator waehrend Warten auf erste Antwort */}
        {(sending || isStreaming) && !streamingText && (
          <div className="flex justify-start" data-testid="typing-indicator">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-quartier-green" />
              <span className="text-sm text-muted-foreground">
                Quartier-Lotse denkt nach...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
