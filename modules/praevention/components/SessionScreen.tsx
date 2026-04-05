"use client";

// Praevention — Taegliche Sitzung (State-Machine)
// Begruessung → MoodCheck → Uebung (Chat) → MoodCheck → Abschluss

import { useState, useRef } from "react";
import { ArrowLeft, Send, AlertTriangle, Mic, MicOff } from "lucide-react";
import MoodCheck from "./MoodCheck";
import BreathAnimation from "./BreathAnimation";
import VoiceConsentDialog from "./VoiceConsentDialog";

type SessionPhase =
  | "voice_consent"
  | "greeting"
  | "mood_before"
  | "exercise"
  | "mood_after"
  | "summary"
  | "emergency";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SessionScreenProps {
  enrollmentId: string;
  weekNumber: number;
  onComplete: (data: {
    moodBefore: number | null;
    moodAfter: number | null;
    durationSeconds: number;
    escalationFlag: string;
  }) => void;
  onCancel: () => void;
}

export default function SessionScreen({
  enrollmentId,
  weekNumber,
  onComplete,
  onCancel,
}: SessionScreenProps) {
  const [phase, setPhase] = useState<SessionPhase>("voice_consent");
  const [voiceConsent, setVoiceConsent] = useState<boolean | null>(null);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showBreath, setShowBreath] = useState(false);
  const [escalationFlag, setEscalationFlag] = useState("normal");
  const startTimeRef = useRef(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Voice-Consent Entscheidung
  const handleVoiceConsent = (consented: boolean) => {
    setVoiceConsent(consented);
    setPhase("greeting");
  };

  // Sprach-Aufnahme starten (wenn Voice-Consent)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "audio.webm");

        try {
          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const { text } = await res.json();
            if (text?.trim()) sendMessage(text.trim());
          }
        } catch {
          // Transkription fehlgeschlagen — ignorieren
        }
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      // Mikrofon-Zugriff verweigert
      setIsRecording(false);
    }
  };

  // Sprach-Aufnahme stoppen
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  // TTS: Antwort vorlesen (wenn Voice-Consent)
  const speakText = async (text: string) => {
    if (!voiceConsent) return;
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "nova", speed: 0.85 }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
      }
    } catch {
      // TTS fehlgeschlagen — ignorieren
    }
  };

  // KI-Nachricht senden
  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/prevention/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          enrollmentId,
          sessionHistory: updated,
          moodBefore,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      // TTS: Antwort vorlesen wenn Voice-Consent
      if (voiceConsent && data.reply) {
        speakText(data.reply);
      }

      // Eskalation behandeln
      if (data.escalationLevel === "red") {
        setEscalationFlag("abgebrochen_eskalation");
        setPhase("emergency");
      } else if (data.escalationLevel === "yellow") {
        setEscalationFlag("belastung_erkannt");
      }

      // Atem-Uebung vorschlagen?
      if (
        data.suggestedExercise === "achtsamkeit_atmen" ||
        data.reply.toLowerCase().includes("atemübung")
      ) {
        setShowBreath(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Es tut mir leid, es ist ein technischer Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(
        () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  };

  // Begruessung
  const handleStart = () => {
    setPhase("mood_before");
  };

  // MoodCheck vorher
  const handleMoodBefore = (mood: number) => {
    setMoodBefore(mood);
    setPhase("exercise");
    // Erste KI-Nachricht ausloesen
    const greeting =
      mood === 3
        ? "Mir geht es heute nicht so gut."
        : mood === 2
          ? "Es geht so."
          : "Mir geht es gut.";
    sendMessage(greeting);
  };

  // MoodCheck nachher
  const handleMoodAfter = (mood: number) => {
    setMoodAfter(mood);
    setPhase("summary");
  };

  // Sitzung beenden
  const handleFinish = () => {
    const durationSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000,
    );
    onComplete({
      moodBefore,
      moodAfter,
      durationSeconds,
      escalationFlag,
    });
  };

  // Uebung beenden → MoodCheck nachher
  const handleEndExercise = () => {
    setPhase("mood_after");
  };

  return (
    <div className="flex min-h-[60vh] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-3">
        <button onClick={onCancel} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold text-gray-800">Tägliche Übung</h1>
          <p className="text-xs text-gray-500">Woche {weekNumber}</p>
        </div>
      </div>

      {/* Voice-Consent Dialog */}
      <VoiceConsentDialog
        open={phase === "voice_consent"}
        onDecision={handleVoiceConsent}
      />

      {/* Content basierend auf Phase */}
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        {/* Begruessung */}
        {phase === "greeting" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-3xl">🧘</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Willkommen zur heutigen Übung
            </h2>
            <p className="max-w-sm text-gray-600">
              Nehmen Sie sich 10-15 Minuten Zeit. Setzen oder legen Sie sich
              bequem hin.
            </p>
            <button
              onClick={handleStart}
              className="h-14 rounded-xl bg-emerald-600 px-8 text-lg font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              Übung starten
            </button>
          </div>
        )}

        {/* MoodCheck vorher */}
        {phase === "mood_before" && (
          <MoodCheck
            title="Wie geht es Ihnen gerade?"
            onSelect={handleMoodBefore}
            skippable
            onSkip={() => {
              setMoodBefore(null);
              setPhase("exercise");
              sendMessage("Ich möchte mit der Übung beginnen.");
            }}
          />
        )}

        {/* Uebung (Chat + optionale Atem-Animation) */}
        {phase === "exercise" && (
          <div className="flex w-full max-w-lg flex-col gap-4">
            {/* Atem-Animation (wenn aktiv) */}
            {showBreath && (
              <div className="flex flex-col items-center gap-2">
                <BreathAnimation
                  pattern="simple"
                  durationSeconds={180}
                  onComplete={() => setShowBreath(false)}
                />
                <button
                  onClick={() => setShowBreath(false)}
                  className="text-sm text-gray-500 underline"
                >
                  Überspringen
                </button>
              </div>
            )}

            {/* Chat-Verlauf */}
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg bg-gray-50 p-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "ml-8 bg-emerald-100 text-emerald-900"
                      : "mr-8 bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="mr-8 animate-pulse rounded-xl bg-white px-4 py-2.5 text-sm text-gray-400 shadow-sm">
                  Einen Moment...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Eingabe */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputText.trim() && !isLoading) {
                    sendMessage(inputText.trim());
                  }
                }}
                placeholder="Ihre Antwort..."
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                disabled={isLoading}
              />
              {/* Mikrofon-Button (nur bei Voice-Consent) */}
              {voiceConsent && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                    isRecording
                      ? "animate-pulse bg-red-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  aria-label={isRecording ? "Aufnahme stoppen" : "Sprechen"}
                >
                  {isRecording ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  if (inputText.trim() && !isLoading) {
                    sendMessage(inputText.trim());
                  }
                }}
                disabled={!inputText.trim() || isLoading}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white transition-all hover:bg-emerald-700 disabled:bg-gray-300"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* Uebung beenden */}
            <button
              onClick={handleEndExercise}
              className="mx-auto text-sm text-gray-500 underline hover:text-gray-700"
            >
              Übung beenden
            </button>
          </div>
        )}

        {/* MoodCheck nachher */}
        {phase === "mood_after" && (
          <MoodCheck
            title="Wie geht es Ihnen jetzt?"
            onSelect={handleMoodAfter}
            skippable
            onSkip={() => {
              setMoodAfter(null);
              setPhase("summary");
            }}
          />
        )}

        {/* Zusammenfassung */}
        {phase === "summary" && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <span className="text-3xl">✨</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Gut gemacht!
            </h2>
            <p className="max-w-sm text-gray-600">
              Sie haben Ihre heutige Übung abgeschlossen. Bis morgen!
            </p>
            {moodBefore !== null && moodAfter !== null && (
              <div className="rounded-xl bg-emerald-50 px-6 py-3">
                <p className="text-sm text-emerald-800">
                  Stimmung:{" "}
                  {moodBefore === 1 ? "☀️" : moodBefore === 2 ? "☁️" : "🌧️"}
                  {" → "}
                  {moodAfter === 1 ? "☀️" : moodAfter === 2 ? "☁️" : "🌧️"}
                </p>
              </div>
            )}
            <button
              onClick={handleFinish}
              className="h-14 rounded-xl bg-emerald-600 px-8 text-lg font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              Fertig
            </button>
          </div>
        )}

        {/* Notfall */}
        {phase === "emergency" && (
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-red-50 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600" />
            <h2 className="text-xl font-semibold text-red-800">
              Bitte rufen Sie jetzt an
            </h2>
            <div className="space-y-3">
              <a
                href="tel:112"
                className="block rounded-xl bg-red-600 px-8 py-4 text-lg font-bold text-white"
              >
                112 — Notruf
              </a>
              <a
                href="tel:08001110111"
                className="block rounded-xl bg-amber-500 px-8 py-4 text-lg font-bold text-white"
              >
                0800 111 0 111 — Telefonseelsorge
              </a>
            </div>
            <p className="text-sm text-red-700">
              Kostenlos, rund um die Uhr erreichbar. Sie sind nicht allein.
            </p>
            <button
              onClick={handleFinish}
              className="mt-4 text-sm text-gray-500 underline"
            >
              Sitzung beenden
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
