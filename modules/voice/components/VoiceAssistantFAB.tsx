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
import { getIOSAudioManager } from "../services/ios-audio-manager";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { resolveFabVisibility } from "@/lib/ui/fabVisibility";
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
  useEffect(() => {
    setMounted(true);
    // iOS Audio-Manager frueh initialisieren — registriert Touch/Click-Listener
    // fuer Silent-Buffer-Unlock (muss VOR dem ersten TTS-Aufruf passieren)
    getIOSAudioManager().init();
  }, []);

  // Scroll-Hide: FAB verschwindet bei Scroll-Down, erscheint bei Scroll-Up
  const [fabVisible, setFabVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setFabVisible((currentVisible) =>
        resolveFabVisibility({
          currentY,
          previousY: lastScrollYRef.current,
          innerWidth: window.innerWidth,
          currentVisible,
        }),
      );
      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
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
    reset: resetStreaming,
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
        const userMessage: ChatMessage = {
          role: "user" as const,
          content: text,
        };
        const newMessages: ChatMessage[] = [...sheetMessages, userMessage];
        const limitedMessages = newMessages.slice(-(MAX_EXCHANGES * 2));

        // User-Nachricht in State persistieren (Codex-Review: Multi-Turn war kaputt)
        setSheetMessages(newMessages);

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

      // Kein Auto-TTS — iOS blockiert Autoplay ohne User-Geste.
      // Stattdessen: Text prominent anzeigen + manueller "Vorlesen"-Button.
      setSheetState("result");
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
        setTranscript(text); // Codex-Review: transcript war nie gesetzt im Voice-Pfad
        sendToCompanion(text);
      },
      onAudioLevel: (level: number) => {
        setAudioLevel(level);
      },
      onStateChange: (state) => {
        // WhisperEngine meldet 'processing' wenn MediaRecorder gestoppt und Transkription laeuft
        // → sofort Spinner anzeigen statt auf Recording-Screen haengen zu bleiben
        if (state === "processing") {
          setSheetState("processing");
          setAudioLevel(0);
        } else if (state === "idle") {
          // Engine zurueck im Idle (z.B. nach Fehler) → nur wenn noch nicht weitergeschaltet
          setAudioLevel(0);
        }
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

  // Fallback: Texteingabe statt Sprache (BUG-07 iOS Fix)
  const handleTextSubmit = useCallback(
    (text: string) => {
      setTranscript(text);
      // User-Message wird von sendToCompanion persistiert (Fix #1)
      sendToCompanion(text);
    },
    [sendToCompanion],
  );

  // "Nochmal sprechen": Zurueck zum idle-State (Konversation bleibt erhalten)
  const handleRetry = useCallback(() => {
    resetStreaming(); // Laufende Streams abbrechen (Codex-Review: Ghost-Responses)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setResponseMessage("");
    setTranscript("");
    setToolResults([]);
    setConfirmations([]);
    setSheetState("idle");
  }, [resetStreaming]);

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
    resetStreaming(); // Laufende Streams abbrechen (Codex-Review: Ghost-Responses)
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
  }, [resetStreaming]);

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
          onTextSubmit={handleTextSubmit}
        />
      </Sheet>
    </>
  );
}
