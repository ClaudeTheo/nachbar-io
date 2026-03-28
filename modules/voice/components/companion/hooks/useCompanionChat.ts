// components/companion/hooks/useCompanionChat.ts
// Custom Hook: State, Streaming, Speech und API-Logik fuer CompanionChat
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSpeechEngine } from "../../../engines/create-speech-engine";
import type {
  SpeechEngine,
  SpeechEngineState,
} from "../../../engines/speech-engine";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useAuth } from "@/hooks/use-auth";
import {
  type ChatMessage,
  type ChatResponse,
  type ToolResult,
  type ToolConfirmation,
  WELCOME_MESSAGE,
  generateId,
  loadMessages,
  saveMessages,
  persistToSupabase,
  loadFromSupabase,
} from "./companion-chat-utils";

export type {
  ChatMessage,
  ToolResult,
  ToolConfirmation,
} from "./companion-chat-utils";

export interface UseCompanionChatReturn {
  messages: ChatMessage[];
  inputValue: string;
  setInputValue: (v: string) => void;
  sending: boolean;
  confirmLoading: string | null;
  recording: boolean;
  speechState: SpeechEngineState;
  isStreaming: boolean;
  streamingText: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleSend: (text?: string) => Promise<void>;
  handleConfirmTool: (
    confirmation: ToolConfirmation,
    msgId: string,
  ) => Promise<void>;
  handleCancelTool: (confirmation: ToolConfirmation, msgId: string) => void;
  toggleRecording: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useCompanionChat(): UseCompanionChatReturn {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [speechState, setSpeechState] = useState<SpeechEngineState>("idle");
  const streamingToolResults = useRef<ToolResult[]>([]);
  const streamingConfirmations = useRef<ToolConfirmation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<SpeechEngine | null>(null);

  const {
    streamingText,
    isStreaming,
    error: streamingError,
    sendStreaming,
  } = useStreamingChat({
    onToolResult: (event) => {
      streamingToolResults.current.push({
        tool: event.name,
        summary: event.result.summary,
        success: event.result.success,
        route: event.result.route,
      });
    },
    onConfirmation: (event) => {
      streamingConfirmations.current.push({
        tool: event.tool,
        params: event.params,
        description: event.description,
      });
    },
  });

  useEffect(() => {
    async function loadHistory() {
      if (user?.id) {
        const supabaseMessages = await loadFromSupabase(user.id);
        if (supabaseMessages) {
          setMessages(supabaseMessages);
          return;
        }
      }
      const loaded = loadMessages();
      setMessages(loaded);
    }
    loadHistory();
  }, [user?.id]);

  useEffect(() => {
    saveMessages(messages);
    if (user?.id && messages.length > 1) {
      persistToSupabase(user.id, messages);
    }
  }, [messages, user?.id]);

  useEffect(() => {
    engineRef.current = createSpeechEngine();
    return () => {
      engineRef.current?.cleanup();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === "function"
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim();
      if (!content || sending) return;

      setInputValue("");
      setSending(true);
      streamingToolResults.current = [];
      streamingConfirmations.current = [];
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      try {
        const apiMessages = [...messages, userMsg]
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        await sendStreaming(apiMessages);
      } catch {
        // Fehler: useStreamingChat setzt error
      }

      setSending(false);
    },
    [inputValue, sending, messages, sendStreaming],
  );

  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && streamingText) {
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: streamingText,
        toolResults:
          streamingToolResults.current.length > 0
            ? [...streamingToolResults.current]
            : undefined,
        confirmations:
          streamingConfirmations.current.length > 0
            ? [...streamingConfirmations.current]
            : undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const navResult = streamingToolResults.current.find((r) => r.route);
      if (navResult?.route) {
        setTimeout(() => router.push(navResult.route!), 600);
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, streamingText, router]);

  useEffect(() => {
    if (streamingError) {
      toast.error("Verbindungsfehler. Bitte versuchen Sie es erneut.");
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "Entschuldigung, es gab einen Verbindungsfehler. Bitte versuchen Sie es erneut.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  }, [streamingError]);

  const handleConfirmTool = useCallback(
    async (confirmation: ToolConfirmation, msgId: string) => {
      setConfirmLoading(msgId);

      try {
        const apiMessages = messages
          .filter((m) => m.id !== "welcome")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/companion/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            confirmTool: {
              tool: confirmation.tool,
              params: confirmation.params,
            },
          }),
        });

        if (!res.ok) throw new Error(`Fehler: ${res.status}`);

        const data: ChatResponse = await res.json();

        setMessages((prev) => {
          const updated = prev.map((m) => {
            if (m.id === msgId && m.confirmations) {
              return {
                ...m,
                confirmations: m.confirmations.filter(
                  (c) => c.tool !== confirmation.tool,
                ),
              };
            }
            return m;
          });

          const resultMsg: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: data.message || "Aktion ausgefuehrt.",
            toolResults: data.toolResults,
            timestamp: Date.now(),
          };

          return [...updated, resultMsg];
        });
      } catch {
        toast.error("Aktion konnte nicht ausgefuehrt werden.");
      }

      setConfirmLoading(null);
    },
    [messages],
  );

  const handleCancelTool = useCallback(
    (confirmation: ToolConfirmation, msgId: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.confirmations) {
            return {
              ...m,
              confirmations: m.confirmations.filter(
                (c) => c.tool !== confirmation.tool,
              ),
            };
          }
          return m;
        }),
      );
      toast("Aktion abgebrochen.");
    },
    [],
  );

  const toggleRecording = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      toast.error("Spracheingabe ist in Ihrem Browser nicht verfügbar.");
      return;
    }

    if (recording) {
      engine.stopListening();
      setRecording(false);
      setSpeechState("idle");
    } else {
      setRecording(true);
      engine.startListening({
        onTranscript: (text) => {
          setRecording(false);
          setSpeechState("idle");
          if (text.trim()) {
            handleSend(text.trim());
          }
        },
        onAudioLevel: () => {
          // Fuer spaeter: Waveform-Visualisierung
        },
        onStateChange: (state) => {
          setSpeechState(state);
          if (state === "idle") {
            setRecording(false);
          }
        },
        onError: (msg) => {
          setRecording(false);
          setSpeechState("idle");
          toast.error(msg || "Spracherkennung fehlgeschlagen.");
        },
      });
    }
  }, [recording, handleSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return {
    messages,
    inputValue,
    setInputValue,
    sending,
    confirmLoading,
    recording,
    speechState,
    isStreaming,
    streamingText,
    messagesEndRef,
    inputRef,
    handleSend,
    handleConfirmTool,
    handleCancelTool,
    toggleRecording,
    handleKeyDown,
  };
}
