"use client";

// components/VoiceAssistantFAB.tsx
// Nachbar.io — Container-Komponente fuer den KI-Sprach-Assistenten
// Companion-Integration: Nutzt /api/companion/chat mit Konversations-Modus
// Subkomponenten: FABButton, VoiceSheetContent (SheetContent, PushToTalkButton, ToolResultsDisplay)

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "sonner";
import { createSpeechEngine } from "../engines/create-speech-engine";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
} from "../engines/speech-engine";
import { FABButton } from "./assistant/FABButton";
import { VoiceSheetContent } from "./assistant/SheetContent";
import type {
  SheetState,
  ChatMessage,
  CompanionToolResult,
  CompanionConfirmation,
  CompanionResponse,
} from "./assistant/types";
import { MAX_EXCHANGES } from "./assistant/types";

export function VoiceAssistantFAB() {
  const router = useRouter();
  // SSR-Guard: Verhindert Hydration-Mismatch (Server rendert null, Client rendert Button)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Scroll-Hide: FAB verschwindet bei Scroll-Down, erscheint bei Scroll-Up
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollYRef.current + 10) {
        setFabVisible(false);
      } else if (currentY < lastScrollYRef.current - 10) {
        setFabVisible(true);
      }
      lastScrollYRef.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Engine lazy initialisieren (nur im Browser)
  const engineRef = useRef<SpeechEngine | null | undefined>(undefined);
  if (mounted && engineRef.current === undefined) {
    engineRef.current = createSpeechEngine();
  }

  // State
  const [sheetState, setSheetState] = useState<SheetState>("closed");
  const [audioLevel, setAudioLevel] = useState(0);
  const [responseMessage, setResponseMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sheetMessages, setSheetMessages] = useState<ChatMessage[]>([]);
  const [toolResults, setToolResults] = useState<CompanionToolResult[]>([]);
  const [confirmations, setConfirmations] = useState<CompanionConfirmation[]>(
    [],
  );
  const [exchangeCount, setExchangeCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Push-to-Talk: Startzeitpunkt fuer Mindestdauer-Pruefung
  const recordingStartTimeRef = useRef<number>(0);
  // Streaming Tool-Ergebnisse und Bestaetigungen sammeln
  const streamToolResultsRef = useRef<CompanionToolResult[]>([]);
  const streamConfirmationsRef = useRef<CompanionConfirmation[]>([]);

  // Streaming-Chat Hook fuer SSE-basierte Antworten
  const {
    streamingText,
    isStreaming: isStreamingChat,
    sendStreaming,
  } = useStreamingChat({
    onToolResult: (event) => {
      const result = event.result as CompanionToolResult;
      streamToolResultsRef.current.push({
        success: result.success,
        summary: result.summary,
        route: result.route,
      });
    },
    onConfirmation: (event) => {
      streamConfirmationsRef.current.push({
        tool: event.tool,
        params: event.params,
        description: event.description,
      });
    },
  });

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      engineRef.current?.cleanup();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Companion-API-Aufruf nach Transkription (Streaming)
  const sendToCompanion = useCallback(
    async (
      text: string,
      confirmTool?: { tool: string; params: Record<string, unknown> },
    ) => {
      setSheetState("processing");
      setAudioLevel(0);

      // Streaming-Refs zuruecksetzen
      streamToolResultsRef.current = [];
      streamConfirmationsRef.current = [];

      try {
        // Bei Tool-Bestaetigung: Nicht-Streaming (einfacher JSON-Request)
        if (confirmTool) {
          const res = await fetch("/api/companion/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: sheetMessages,
              confirmTool,
            }),
          });
          if (!res.ok) throw new Error(`API-Fehler: ${res.status}`);
          const data: CompanionResponse = await res.json();

          setSheetMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.message },
          ]);
          setResponseMessage(data.message);
          setToolResults(data.toolResults ?? []);
          setConfirmations(data.confirmations ?? []);
          setSheetState("result");
          return;
        }

        // Nachrichten-Array aufbauen mit neuer User-Nachricht
        const newMessages: ChatMessage[] = [
          ...sheetMessages,
          { role: "user" as const, content: text },
        ];
        const limitedMessages = newMessages.slice(-(MAX_EXCHANGES * 2));

        // Streaming-Request
        setSheetState("speaking");
        await sendStreaming(limitedMessages);
      } catch (err) {
        console.error(
          "[VoiceAssistantFAB] Companion-Anfrage fehlgeschlagen:",
          err,
        );
        setErrorMessage(
          "Sprachassistent konnte die Anfrage nicht verarbeiten.",
        );
        setSheetState("error");
      }
    },
    [sheetMessages, sendStreaming],
  );

  // Wenn Streaming endet -> TTS starten und zu result wechseln
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (
      prevStreamingRef.current &&
      !isStreamingChat &&
      streamingText &&
      sheetState === "speaking"
    ) {
      // Nachrichten-History aktualisieren
      setSheetMessages((prev) => [
        ...prev,
        { role: "assistant", content: streamingText },
      ]);
      setExchangeCount((prev) => prev + 1);
      setResponseMessage(streamingText);
      setToolResults([...streamToolResultsRef.current]);
      setConfirmations([...streamConfirmationsRef.current]);

      // Navigation pruefen
      const navResult = streamToolResultsRef.current.find((r) => r.route);
      if (navResult?.route) {
        router.push(navResult.route);
        toast.success(streamingText || "Navigation...");
        setSheetState("closed");
        prevStreamingRef.current = isStreamingChat;
        return;
      }

      // TTS: Antwort vorlesen
      (async () => {
        try {
          const ttsRes = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: streamingText }),
          });

          if (ttsRes.ok) {
            const audioBlob = await ttsRes.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setSheetState("result");
            };

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setSheetState("result");
            };

            await audio.play();
          } else {
            setSheetState("result");
          }
        } catch {
          setSheetState("result");
        }
      })();
    }
    prevStreamingRef.current = isStreamingChat;
  }, [isStreamingChat, streamingText, sheetState, router]);

  // Engine starten
  const startRecording = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    setSheetState("recording");
    setAudioLevel(0);
    setErrorMessage("");

    const callbacks: SpeechEngineCallbacks = {
      onTranscript: (text: string) => {
        sendToCompanion(text);
      },
      onAudioLevel: (level: number) => {
        setAudioLevel(level);
      },
      onStateChange: () => {
        // State wird ueber sheetState gesteuert
      },
      onError: (message: string) => {
        const userMessage =
          message.includes("not-allowed") || message.includes("Mikrofon")
            ? "Bitte Mikrofon freigeben in den Browser-Einstellungen."
            : "Spracherkennung nicht verfügbar.";
        setErrorMessage(userMessage);
        setSheetState("error");
      },
    };

    engine.startListening(callbacks);
  }, [sendToCompanion]);

  // Engine stoppen
  const stopRecording = useCallback(() => {
    engineRef.current?.stopListening();
  }, []);

  // FAB-Klick: Sheet oeffnen im idle-State (Push-to-Talk)
  const handleFabClick = useCallback(() => {
    if (sheetState === "closed") {
      setSheetMessages([]);
      setExchangeCount(0);
      setSheetState("idle");
    }
  }, [sheetState]);

  // Push-to-Talk: Druecken startet Aufnahme
  const handlePushStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in e) e.preventDefault();
      recordingStartTimeRef.current = Date.now();
      startRecording();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    [startRecording],
  );

  // Push-to-Talk: Loslassen stoppt Aufnahme (mit Mindestdauer-Pruefung)
  const handlePushEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in e) e.preventDefault();
      if (sheetState !== "recording") return;
      const elapsed = Date.now() - recordingStartTimeRef.current;
      if (elapsed < 500) {
        engineRef.current?.stopListening();
        setSheetState("idle");
        setAudioLevel(0);
        toast.error("Bitte etwas länger gedrückt halten");
      } else {
        stopRecording();
      }
    },
    [sheetState, stopRecording],
  );

  // Sprachausgabe stoppen
  const handleStopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSheetState("result");
  }, []);

  // Tool-Bestaetigung: Write-Action ausfuehren
  const handleConfirm = useCallback(
    (confirmation: CompanionConfirmation) => {
      sendToCompanion(transcript, {
        tool: confirmation.tool,
        params: confirmation.params,
      });
    },
    [sendToCompanion, transcript],
  );

  // "Nochmal sprechen": Zurueck zum idle-State (Konversation bleibt erhalten)
  const handleRetry = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setResponseMessage("");
    setTranscript("");
    setToolResults([]);
    setConfirmations([]);
    setSheetState("idle");
  }, []);

  // Navigation zu einem Tool-Ergebnis mit Route
  const handleNavigate = useCallback(
    (route: string) => {
      router.push(route);
      setSheetState("closed");
    },
    [router],
  );

  // Sheet schliessen
  const handleClose = useCallback(() => {
    engineRef.current?.stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSheetState("closed");
    setResponseMessage("");
    setTranscript("");
    setToolResults([]);
    setConfirmations([]);
    setSheetMessages([]);
    setExchangeCount(0);
    setAudioLevel(0);
  }, []);

  // Nichts rendern wenn nicht gemountet oder keine Engine verfuegbar
  if (!mounted || !engineRef.current) {
    return null;
  }

  const sheetOpen = sheetState !== "closed";
  const showContinueHint = exchangeCount >= MAX_EXCHANGES;

  return (
    <>
      <FABButton onClick={handleFabClick} visible={fabVisible} />

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <VoiceSheetContent
          sheetState={sheetState}
          audioLevel={audioLevel}
          responseMessage={responseMessage}
          transcript={transcript}
          errorMessage={errorMessage}
          toolResults={toolResults}
          confirmations={confirmations}
          showContinueHint={showContinueHint}
          isStreamingChat={isStreamingChat}
          streamingText={streamingText}
          onPushStart={handlePushStart}
          onPushEnd={handlePushEnd}
          onStopSpeaking={handleStopSpeaking}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
          onNavigate={handleNavigate}
          onGoToCompanion={() => router.push("/companion")}
          onClose={handleClose}
        />
      </Sheet>
    </>
  );
}
