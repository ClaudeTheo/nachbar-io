"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogMode } from "@/hooks/useDialogMode";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { AutoListenIndicator } from "./AutoListenIndicator";
import { StreamingTextDisplay } from "./StreamingTextDisplay";
import { SpeakerAnimation } from "../voice/SpeakerAnimation";
import { createSpeechEngine } from "../../engines/create-speech-engine";
import { SilenceDetector } from "../../engines/silence-detector";
import { SentenceStreamTTS } from "../../engines/sentence-stream-tts";
import type { SpeechEngine } from "../../engines/speech-engine";

interface DialogModeProps {
  onMessage?: (role: "user" | "assistant", content: string) => void;
  onMicError?: () => void; // Callback wenn Mikrofon verweigert -> Tab-Wechsel zu Chat
}

// DialogMode — Sprach-Dialog-Modus mit State-Machine
// Nutzt useDialogMode für States, SilenceDetector, SentenceStreamTTS
export function DialogMode({ onMessage, onMicError }: DialogModeProps) {
  const dialog = useDialogMode();
  const { streamingText, isStreaming, sendStreaming } = useStreamingChat();
  const [textInput, setTextInput] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [micBlocked, setMicBlocked] = useState(false);

  const engineRef = useRef<SpeechEngine | null>(null);
  const silenceRef = useRef<SilenceDetector | null>(null);
  const ttsRef = useRef<SentenceStreamTTS | null>(null);
  const messagesRef = useRef<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  // Speech Engine einmalig initialisieren
  useEffect(() => {
    engineRef.current = createSpeechEngine();
    return () => engineRef.current?.cleanup();
  }, []);

  // Streaming-Text verarbeiten: Sätze extrahieren und an TTS weiterleiten
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (isStreaming && streamingText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentResponse(streamingText);
    }

    // Stream beendet
    if (prevStreamingRef.current && !isStreaming && streamingText) {
      setCurrentResponse(streamingText);
      onMessage?.("assistant", streamingText);
      messagesRef.current.push({ role: "assistant", content: streamingText });

      // TTS für restlichen Text
      if (ttsRef.current) {
        const remaining = ttsRef.current.flush();
        if (remaining.length > 0) {
          ttsRef.current.playQueue(remaining);
        }
      }

      dialog.setResponse(streamingText);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, streamingText, dialog, onMessage]);

  // Nachricht an API senden
  const sendMessage = useCallback(
    async (text: string) => {
      onMessage?.("user", text);
      messagesRef.current.push({ role: "user", content: text });
      setCurrentResponse("");

      // TTS vorbereiten
      ttsRef.current = new SentenceStreamTTS({
        onSpeakingDone: () => dialog.setSpeakingDone(),
      });

      dialog.handleTranscript(text);

      // Falls Abschied erkannt, nicht senden
      if (dialog.isFarewell(text)) return;

      await sendStreaming(messagesRef.current);
    },
    [dialog, onMessage, sendStreaming],
  );

  // Dialog starten
  const handleStart = useCallback(() => {
    dialog.startDialog();

    // Silence Detector starten
    silenceRef.current = new SilenceDetector({
      silenceThreshold: 0.05,
      silenceDurationMs: 3000,
      onSilence: () => {
        // Nach 3s Stille: "Noch etwas?" fragen
        dialog.triggerSilenceCheck();
      },
      onLevelChange: (level) => {
        dialog.setAudioLevel(level);
      },
    });

    // Spracheingabe starten wenn verfügbar
    const engine = engineRef.current;
    if (engine) {
      engine.startListening({
        onTranscript: (text) => {
          if (text.trim()) {
            sendMessage(text.trim());
          }
        },
        onAudioLevel: (level) => {
          silenceRef.current?.feedAudioLevel(level);
        },
        onStateChange: () => {},
        onError: (msg) => {
          // Mikrofon verweigert -> Fallback auf Text-Chat
          if (msg.includes("not-allowed") || msg.includes("Mikrofon")) {
            setMicBlocked(true);
            dialog.stopDialog();
            onMicError?.();
          }
        },
      });
    }
  }, [dialog, sendMessage, onMicError]);

  // Dialog stoppen
  const handleStop = useCallback(() => {
    dialog.stopDialog();
    engineRef.current?.stopListening();
    silenceRef.current?.cleanup();
    silenceRef.current = null;
    ttsRef.current?.stop();
    ttsRef.current = null;
    setCurrentResponse("");
  }, [dialog]);

  // Text-Fallback: Enter zum Senden
  const handleTextSubmit = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    sendMessage(text);
  }, [textInput, sendMessage]);

  // --- Render ---
  const isActive = dialog.state !== "idle";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
      {/* Idle: Großer Start-Button oder Mikrofon-Hinweis */}
      {!isActive && !micBlocked && (
        <Button
          onClick={handleStart}
          className="min-h-[80px] w-full max-w-sm rounded-2xl bg-[#4CAF87] text-lg font-semibold text-white hover:bg-[#4CAF87]/90"
          aria-label="Gespräch starten"
        >
          <Mic className="mr-3 h-6 w-6" />
          Gespräch starten
        </Button>
      )}
      {!isActive && micBlocked && (
        <div
          className="w-full max-w-sm rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4 text-center"
          data-testid="mic-blocked-hint"
        >
          <p className="text-sm font-medium text-[#2D3142]">
            Mikrofon nicht verfügbar.
          </p>
          <p className="mt-1 text-xs text-[#2D3142]/60">
            Bitte nutzen Sie den Text-Chat.
          </p>
        </div>
      )}

      {/* Aktiv: Dialog-UI */}
      {isActive && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          {/* State: greeting/speaking — KI spricht */}
          {(dialog.state === "greeting" || dialog.state === "speaking") && (
            <div className="flex w-full flex-col items-center gap-3">
              <SpeakerAnimation isPlaying={true} />
              {currentResponse && (
                <div className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-[#2D3142]">
                  <StreamingTextDisplay
                    text={currentResponse}
                    isStreaming={isStreaming}
                  />
                </div>
              )}
              {dialog.state === "greeting" && !currentResponse && (
                <p className="text-sm text-[#2D3142]/70">
                  Hallo, wie kann ich Ihnen helfen?
                </p>
              )}
            </div>
          )}

          {/* State: listening — Zuhoeren */}
          {dialog.state === "listening" && (
            <AutoListenIndicator
              isListening={true}
              audioLevel={dialog.audioLevel}
            />
          )}

          {/* State: processing — Verarbeiten */}
          {dialog.state === "processing" && (
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#4CAF87]/30 border-t-[#4CAF87]" />
              <p className="text-sm text-[#2D3142]/70">Verarbeite...</p>
            </div>
          )}

          {/* State: silence_check */}
          {dialog.state === "silence_check" && (
            <p className="text-base font-medium text-[#2D3142]">Noch etwas?</p>
          )}

          {/* Stopp-Button (immer sichtbar während Dialog) */}
          <Button
            onClick={handleStop}
            className="min-h-[80px] w-full rounded-2xl bg-red-500 text-lg font-semibold text-white hover:bg-red-600"
            aria-label="Stopp"
          >
            <Square className="mr-3 h-5 w-5" />
            Stopp
          </Button>

          {/* Text-Fallback (kleines Eingabefeld) */}
          <div className="flex w-full gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              placeholder="Text eingeben..."
              className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-[#4CAF87] focus:outline-none focus:ring-1 focus:ring-[#4CAF87]"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              size="icon"
              className="h-10 w-10 rounded-full bg-[#4CAF87] hover:bg-[#4CAF87]/90 disabled:opacity-40"
              aria-label="Senden"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
