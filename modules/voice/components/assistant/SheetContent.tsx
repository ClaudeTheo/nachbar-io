"use client";

// components/voice-assistant/SheetContent.tsx
// Nachbar.io — Sheet-Inhalt fuer den Voice-Assistenten (per-state Rendering)

import { useState } from "react";
import {
  Mic,
  Keyboard,
  Loader2,
  TriangleAlert,
  MessageCircle,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  ArrowRight,
  Send,
} from "lucide-react";
import {
  SheetContent as ShadcnSheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SpeakerAnimation } from "../voice/SpeakerAnimation";
import { StreamingTextDisplay } from "../companion/StreamingTextDisplay";
import { PushToTalkButton } from "./PushToTalkButton";
import { ToolResultsDisplay } from "./ToolResultsDisplay";
import type {
  SheetState,
  CompanionToolResult,
  CompanionConfirmation,
} from "./types";

interface VoiceSheetContentProps {
  sheetState: SheetState;
  audioLevel: number;
  responseMessage: string;
  transcript: string;
  errorMessage: string;
  toolResults: CompanionToolResult[];
  confirmations: CompanionConfirmation[];
  showContinueHint: boolean;
  isStreamingChat: boolean;
  streamingText: string;
  /** Handler: Push-to-Talk starten */
  onPushStart: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Handler: Push-to-Talk stoppen */
  onPushEnd: (e: React.MouseEvent | React.TouchEvent) => void;
  /** Handler: Sprachausgabe stoppen */
  onStopSpeaking: () => void;
  /** Handler: Tool-Bestaetigung */
  onConfirm: (confirmation: CompanionConfirmation) => void;
  /** Handler: Nochmal sprechen */
  onRetry: () => void;
  /** Handler: Navigation zu Route */
  onNavigate: (route: string) => void;
  /** Handler: Zum Companion navigieren */
  onGoToCompanion: () => void;
  /** Handler: Sheet schliessen */
  onClose: () => void;
  /** Handler: Text-Eingabe als Fallback absenden (BUG-07 iOS Fix) */
  onTextSubmit?: (text: string) => void;
}

/** Sheet-Inhalt: Rendert je nach Zustand unterschiedliche UI-Elemente */
export function VoiceSheetContent({
  sheetState,
  audioLevel,
  responseMessage,
  transcript,
  errorMessage,
  toolResults,
  confirmations,
  showContinueHint,
  isStreamingChat,
  streamingText,
  onPushStart,
  onPushEnd,
  onStopSpeaking,
  onConfirm,
  onRetry,
  onNavigate,
  onGoToCompanion,
  onClose,
  onTextSubmit,
}: VoiceSheetContentProps) {
  // Fallback-Texteingabe (BUG-07: iOS Safari SpeechRecognition freeze)
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");
  return (
    <ShadcnSheetContent
      side="bottom"
      className="mx-auto max-w-lg rounded-t-2xl"
    >
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
        {/* IDLE: Push-to-Talk Button + Fallback-Texteingabe (BUG-07) */}
        {sheetState === "idle" && !showContinueHint && (
          <>
            {!showTextInput ? (
              <>
                <PushToTalkButton
                  sheetState={sheetState}
                  audioLevel={audioLevel}
                  onPushStart={onPushStart}
                  onPushEnd={onPushEnd}
                />
                {/* Fallback: Stattdessen tippen */}
                {onTextSubmit && (
                  <button
                    onClick={() => setShowTextInput(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-sm transition-all hover:bg-gray-50 active:scale-95"
                    style={{ minHeight: "44px", touchAction: "manipulation" }}
                    data-testid="type-instead-btn"
                  >
                    <Keyboard className="h-4 w-4" />
                    Stattdessen tippen
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && textInputValue.trim()) {
                        onTextSubmit?.(textInputValue.trim());
                        setTextInputValue("");
                        setShowTextInput(false);
                      }
                    }}
                    placeholder="Ihre Frage eingeben..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#4CAF87] focus:border-transparent"
                    style={{ minHeight: "48px" }}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (textInputValue.trim()) {
                        onTextSubmit?.(textInputValue.trim());
                        setTextInputValue("");
                        setShowTextInput(false);
                      }
                    }}
                    disabled={!textInputValue.trim()}
                    className="rounded-lg bg-[#4CAF87] text-white px-4 disabled:opacity-50 transition-all active:scale-95"
                    style={{ minHeight: "48px", touchAction: "manipulation" }}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowTextInput(false);
                    setTextInputValue("");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-sm transition-all hover:bg-gray-50 active:scale-95"
                  style={{ minHeight: "40px", touchAction: "manipulation" }}
                >
                  <Mic className="h-4 w-4" />
                  Zurück zum Sprechen
                </button>
              </div>
            )}
          </>
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
              onClick={onGoToCompanion}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-base transition-all hover:bg-[#4CAF87]/90 active:scale-95"
              style={{ minHeight: "56px", touchAction: "manipulation" }}
              data-testid="companion-link"
            >
              <ArrowRight className="h-5 w-5" />
              Zum Quartier-Lotsen
            </button>
            <button
              onClick={onClose}
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
          <PushToTalkButton
            sheetState={sheetState}
            audioLevel={audioLevel}
            onPushStart={onPushStart}
            onPushEnd={onPushEnd}
          />
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
                <StreamingTextDisplay text={streamingText} isStreaming={true} />
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
              onClick={onStopSpeaking}
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
                &bdquo;{transcript}&ldquo;
              </div>
            )}

            <ToolResultsDisplay
              toolResults={toolResults}
              confirmations={confirmations}
              onNavigate={onNavigate}
              onConfirm={onConfirm}
            />

            {/* Nochmal sprechen */}
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#4CAF87] text-[#4CAF87] font-medium text-base transition-all hover:bg-[#4CAF87]/10 active:scale-95"
              style={{ minHeight: "48px", touchAction: "manipulation" }}
            >
              <RotateCcw className="h-4 w-4" />
              Nochmal sprechen
            </button>

            {/* Schliessen */}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
              style={{ minHeight: "48px", touchAction: "manipulation" }}
            >
              <X className="h-4 w-4" />
              Schließen
            </button>
          </>
        )}

        {/* ERROR: Fehler + Nochmal versuchen + Stattdessen tippen + Schliessen */}
        {sheetState === "error" && (
          <div className="flex flex-col gap-2">
            <button
              onClick={onRetry}
              data-testid="error-retry-btn"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-base transition-all hover:bg-[#4CAF87]/90 active:scale-95"
              style={{ minHeight: "48px", touchAction: "manipulation" }}
            >
              <RotateCcw className="h-4 w-4" />
              Nochmal versuchen
            </button>
            {onTextSubmit && (
              <button
                onClick={() => {
                  onRetry();
                  // Kurz warten bis idle-State, dann Texteingabe oeffnen
                  setTimeout(() => setShowTextInput(true), 100);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#4CAF87] text-[#4CAF87] font-medium text-base transition-all hover:bg-[#4CAF87]/10 active:scale-95"
                style={{ minHeight: "48px", touchAction: "manipulation" }}
                data-testid="type-instead-error-btn"
              >
                <Keyboard className="h-4 w-4" />
                Stattdessen tippen
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center rounded-xl border border-gray-200 text-[#2D3142] font-medium text-base transition-all hover:bg-gray-50 active:scale-95"
              style={{ minHeight: "48px", touchAction: "manipulation" }}
            >
              Schließen
            </button>
          </div>
        )}
      </div>
    </ShadcnSheetContent>
  );
}
