"use client";

// components/VoiceAssistantFAB.tsx
// Nachbar.io — Floating Action Button fuer den KI-Sprach-Assistenten
// Companion-Integration: Nutzt /api/companion/chat mit Konversations-Modus

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Loader2,
  TriangleAlert,
  MessageCircle,
  Navigation,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { createSpeechEngine } from "@/lib/voice/create-speech-engine";
import { AudioWaveform } from "@/components/voice/AudioWaveform";
import { SpeakerAnimation } from "@/components/voice/SpeakerAnimation";
import { StreamingTextDisplay } from "@/components/companion/StreamingTextDisplay";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
} from "@/lib/voice/speech-engine";

/** Sheet-Zustaende */
type SheetState =
  | "closed"
  | "idle"
  | "recording"
  | "processing"
  | "speaking"
  | "result"
  | "error";

/** Chat-Nachricht fuer den Companion */
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Tool-Ergebnis vom Companion */
interface CompanionToolResult {
  success: boolean;
  summary: string;
  data?: unknown;
  route?: string;
}

/** Tool-Bestaetigung (Write-Tool) */
interface CompanionConfirmation {
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

/** Antwort vom /api/companion/chat Endpoint */
interface CompanionResponse {
  message: string;
  toolResults?: CompanionToolResult[];
  confirmations?: CompanionConfirmation[];
}

/** Maximale Anzahl an Austauschen bevor "Zum Quartier-Lotsen"-Hinweis */
const MAX_EXCHANGES = 2;

export function VoiceAssistantFAB() {
  const router = useRouter();
  // SSR-Guard: Verhindert Hydration-Mismatch (Server rendert null, Client rendert Button)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        setSheetState("speaking"); // Sofort auf speaking (zeigt StreamingTextDisplay)
        await sendStreaming(limitedMessages);

        // Stream beendet — finalen Text aus Hook lesen
        // (streamingText ist im Hook nach sendStreaming-Resolve final)
        // Wir verwenden einen kurzen Delay damit React den State aktualisiert
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
      // Neue Session: Konversation zuruecksetzen
      setSheetMessages([]);
      setExchangeCount(0);
      setSheetState("idle");
    }
  }, [sheetState]);

  // Push-to-Talk: Druecken startet Aufnahme
  const handlePushStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in e) e.preventDefault(); // Ghost-Clicks verhindern
      recordingStartTimeRef.current = Date.now();
      startRecording();
      // Haptisches Feedback
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
        // Zu kurz — abbrechen
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
  // SSR-Guard: Server und Client rendern beide null → kein Hydration-Mismatch
  if (!mounted || !engineRef.current) {
    return null;
  }

  const sheetOpen = sheetState !== "closed";
  const showContinueHint = exchangeCount >= MAX_EXCHANGES;

  return (
    <>
      {/* Floating Action Button — immer gruen */}
      <button
        onClick={handleFabClick}
        className="fixed bottom-24 right-4 z-40 flex items-center justify-center rounded-full shadow-lg bg-[#4CAF87] transition-all hover:scale-110 active:scale-95"
        style={{
          minWidth: "56px",
          minHeight: "56px",
          touchAction: "manipulation",
        }}
        aria-label="Sprachassistent"
        data-testid="voice-assistant-fab"
      >
        <Mic className="h-6 w-6 text-white" />
      </button>

      {/* Bottom-Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
      >
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[#2D3142]">
              {sheetState === "idle" && (
                <>
                  <Mic className="h-5 w-5 text-[#4CAF87]" />
                  Quartier-Lotse
                </>
              )}
              {sheetState === "recording" && (
                <>
                  <Mic className="h-5 w-5 text-[#4CAF87]" />
                  Quartier-Lotse
                </>
              )}
              {sheetState === "processing" && (
                <>
                  <Loader2 className="h-5 w-5 text-[#F59E0B] animate-spin" />
                  Verarbeite...
                </>
              )}
              {sheetState === "speaking" && (
                <>
                  <Volume2 className="h-5 w-5 text-[#4CAF87]" />
                  Sprachausgabe
                </>
              )}
              {sheetState === "result" && (
                <>
                  <MessageCircle className="h-5 w-5 text-[#4CAF87]" />
                  Quartier-Lotse
                </>
              )}
              {sheetState === "error" && (
                <>
                  <TriangleAlert className="h-5 w-5 text-[#F59E0B]" />
                  Mikrofon-Fehler
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {sheetState === "idle" && "Bereit zum Sprechen"}
              {sheetState === "recording" && "Sprechen Sie jetzt..."}
              {sheetState === "processing" && "Ihre Anfrage wird analysiert..."}
              {sheetState === "speaking" && (responseMessage || "")}
              {sheetState === "result" && (responseMessage || "")}
              {sheetState === "error" && errorMessage}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* IDLE: Push-to-Talk Button */}
            {sheetState === "idle" && !showContinueHint && (
              <div className="flex flex-col items-center gap-4 py-4">
                <button
                  data-testid="push-to-talk-btn"
                  onMouseDown={handlePushStart}
                  onMouseUp={handlePushEnd}
                  onMouseLeave={handlePushEnd}
                  onTouchStart={handlePushStart}
                  onTouchEnd={handlePushEnd}
                  className="flex items-center justify-center rounded-full bg-[#4CAF87] text-white shadow-lg select-none"
                  style={{
                    width: "120px",
                    height: "120px",
                    touchAction: "none",
                  }}
                  aria-label="Gedrückt halten zum Sprechen"
                >
                  <Mic className="h-12 w-12" />
                </button>
                <p className="text-base text-[#2D3142] font-medium text-center">
                  Halten Sie gedrückt zum Sprechen
                </p>
              </div>
            )}

            {/* IDLE + MAX_EXCHANGES erreicht: Weiterplaudern-Hinweis */}
            {sheetState === "idle" && showContinueHint && (
              <div
                className="flex flex-col items-center gap-4 py-4"
                data-testid="continue-hint"
              >
                <p className="text-base text-[#2D3142] font-medium text-center">
                  Möchten Sie weiterplaudern?
                </p>
                <button
                  onClick={() => router.push("/companion")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-base transition-all hover:bg-[#4CAF87]/90 active:scale-95"
                  style={{ minHeight: "56px", touchAction: "manipulation" }}
                  data-testid="companion-link"
                >
                  <ArrowRight className="h-5 w-5" />
                  Zum Quartier-Lotsen
                </button>
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: "48px", touchAction: "manipulation" }}
                >
                  <X className="h-4 w-4" />
                  Schließen
                </button>
              </div>
            )}

            {/* RECORDING: Push-to-Talk aktiv (pulsierender Button + Waveform) */}
            {sheetState === "recording" && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative flex items-center justify-center">
                  {/* Pulsierender Ring */}
                  <div
                    className="absolute rounded-full bg-[#4CAF87]/20 animate-pulse"
                    style={{ width: "150px", height: "150px" }}
                  />
                  <button
                    data-testid="push-to-talk-btn"
                    onMouseUp={handlePushEnd}
                    onMouseLeave={handlePushEnd}
                    onTouchEnd={handlePushEnd}
                    className="relative flex items-center justify-center rounded-full bg-[#4CAF87] text-white shadow-lg select-none"
                    style={{
                      width: "130px",
                      height: "130px",
                      touchAction: "none",
                    }}
                    aria-label="Loslassen zum Senden"
                  >
                    <Mic className="h-14 w-14" />
                  </button>
                </div>
                <p className="text-base text-[#4CAF87] font-medium text-center">
                  Lassen Sie los zum Senden
                </p>
                <AudioWaveform audioLevel={audioLevel} isActive={true} />
              </div>
            )}

            {/* PROCESSING: Spinner */}
            {sheetState === "processing" && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-10 w-10 text-[#F59E0B] animate-spin" />
              </div>
            )}

            {/* SPEAKING: Streaming-Text oder Lautsprecher-Animation + Text + Stopp */}
            {sheetState === "speaking" && (
              <>
                {isStreamingChat ? (
                  <div className="text-center text-lg font-medium text-[#2D3142]">
                    <StreamingTextDisplay
                      text={streamingText}
                      isStreaming={true}
                    />
                  </div>
                ) : (
                  <>
                    <SpeakerAnimation isPlaying={true} />
                    <p className="text-center text-lg font-medium text-[#2D3142]">
                      {responseMessage}
                    </p>
                  </>
                )}
                <button
                  onClick={handleStopSpeaking}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: "48px", touchAction: "manipulation" }}
                >
                  <VolumeX className="h-5 w-5" />
                  Vorlesen stoppen
                </button>
              </>
            )}

            {/* RESULT: Ergebnis + Tool-Results + Bestaetigungen + Buttons */}
            {sheetState === "result" && (
              <>
                {/* Transkript */}
                {transcript && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground italic">
                    „{transcript}&ldquo;
                  </div>
                )}

                {/* Tool-Ergebnisse (ActionCards) */}
                {toolResults.length > 0 && (
                  <div className="space-y-2" data-testid="tool-results">
                    {toolResults.map((result, i) => (
                      <div
                        key={i}
                        className="rounded-lg border p-3 flex items-start gap-3"
                      >
                        <div
                          className={`mt-0.5 ${result.success ? "text-[#4CAF87]" : "text-[#F59E0B]"}`}
                        >
                          {result.success ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <TriangleAlert className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[#2D3142]">
                            {result.summary}
                          </p>
                          {result.route && (
                            <button
                              onClick={() => handleNavigate(result.route!)}
                              className="mt-2 flex items-center gap-1 text-sm text-[#4CAF87] font-medium hover:underline"
                            >
                              <Navigation className="h-4 w-4" />
                              Zur Seite
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bestaetigungen (ConfirmationCards) */}
                {confirmations.length > 0 && (
                  <div className="space-y-2" data-testid="confirmations">
                    {confirmations.map((conf, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3"
                      >
                        <p className="text-sm text-[#2D3142] mb-2">
                          {conf.description}
                        </p>
                        <button
                          onClick={() => handleConfirm(conf)}
                          data-testid={`confirm-btn-${i}`}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-sm transition-all hover:bg-[#4CAF87]/90 active:scale-95"
                          style={{
                            minHeight: "44px",
                            touchAction: "manipulation",
                          }}
                        >
                          <Check className="h-4 w-4" />
                          Bestätigen
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nochmal sprechen */}
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#4CAF87] text-[#4CAF87] font-medium text-base transition-all hover:bg-[#4CAF87]/10 active:scale-95"
                  style={{ minHeight: "48px", touchAction: "manipulation" }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Nochmal sprechen
                </button>

                {/* Schliessen */}
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: "48px", touchAction: "manipulation" }}
                >
                  <X className="h-4 w-4" />
                  Schließen
                </button>
              </>
            )}

            {/* ERROR: Fehler + Nochmal versuchen + Schliessen */}
            {sheetState === "error" && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRetry}
                  data-testid="error-retry-btn"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-base transition-all hover:bg-[#4CAF87]/90 active:scale-95"
                  style={{ minHeight: "48px", touchAction: "manipulation" }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Nochmal versuchen
                </button>
                <button
                  onClick={handleClose}
                  className="w-full flex items-center justify-center rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: "48px", touchAction: "manipulation" }}
                >
                  Schließen
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
