"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Begrüßung beim Seitenaufruf
const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Guten Tag! Ich bin die Nachbar KI, Ihr digitaler Begleiter. Wie kann ich Ihnen heute helfen?",
  timestamp: Date.now(),
};

// Vorschläge für den Einstieg
const SUGGESTIONS = [
  "Erzählen Sie mir etwas Schönes",
  "Wie mache ich einen Check-in?",
  "Geben Sie mir einen Gesundheitstipp",
  "Wie beantrage ich einen Pflegegrad?",
  "Was gibt es Neues im Quartier?",
  "Ich fühle mich einsam",
] as const;

// Session-Limit: max. 20 Nachrichten (Token-Budget)
const MAX_SESSION_MESSAGES = 20;
// Cooldown zwischen Nachrichten (ms)
const COOLDOWN_MS = 5_000;
// Kontext-Fenster für die API
const MAX_HISTORY_TO_SEND = 10;

interface SpeechRecognitionEventLike {
  results: { transcript: string; isFinal: boolean }[][];
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

// Speech Recognition Helper (Browser Web Speech API — kostenlos)
function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as WindowWithSpeechRecognition;
  const SpeechRecognition =
    browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = "de-DE";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  return recognition;
}

export default function KioskCompanionPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sessionExhausted, setSessionExhausted] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(
    null,
  );

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-Scroll bei neuen Nachrichten
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Audio-Element für Google Cloud TTS
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // TTS für Assistenten-Antworten (Google Cloud TTS mit Browser-Fallback)
  const speak = useCallback(
    async (text: string) => {
      if (!ttsEnabled) return;
      if (typeof window === "undefined") return;

      // Laufende Wiedergabe stoppen
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      try {
        // Edge TTS (Microsoft Neural Stimmen, kostenlos)
        const res = await fetch("/api/kiosk/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (res.ok) {
          // Raw Audio-Bytes → Blob → ObjectURL → Audio abspielen
          const blob = await res.blob();
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            // ObjectURL aufräumen nach Wiedergabe
            audio.onended = () => URL.revokeObjectURL(url);
            audio.onerror = () => URL.revokeObjectURL(url);
            await audio.play().catch(() => {
              // Autoplay blockiert — ignorieren
              URL.revokeObjectURL(url);
            });
            return;
          }
        }
      } catch {
        // Fallback auf Browser-TTS
      }

      // Browser-TTS als Fallback
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "de-DE";
        utterance.rate = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find((v) => v.lang.startsWith("de"));
        if (germanVoice) utterance.voice = germanVoice;
        window.speechSynthesis.speak(utterance);
      }
    },
    [ttsEnabled],
  );

  // Begrüßung wird NICHT automatisch vorgelesen
  // (Browser Autoplay-Policy blockiert Audio ohne User-Interaktion)

  // Nachricht senden
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || cooldown || sessionExhausted) return;

      // User-Nachricht zählen (nur user-Nachrichten)
      const userCount = messages.filter((m) => m.role === "user").length;
      if (userCount >= MAX_SESSION_MESSAGES) {
        setSessionExhausted(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Wir haben heute schon viel gesprochen! Machen Sie eine kleine Pause und kommen Sie später wieder.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      // User-Nachricht hinzufügen
      const userMsg: ChatMessage = {
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      // Cooldown starten
      setCooldown(true);
      setTimeout(() => setCooldown(false), COOLDOWN_MS);

      try {
        // Nur die letzten N Nachrichten als History senden
        const historyToSend = [...messages, userMsg]
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-MAX_HISTORY_TO_SEND)
          .map(({ role, content }) => ({ role, content }));

        // Die aktuelle User-Nachricht nicht doppelt senden
        // (ist schon in historyToSend enthalten, API bekommt sie als letztes Element)
        const historyWithoutLast = historyToSend.slice(0, -1);

        // user_id aus localStorage holen (wird beim Kiosk-Login gesetzt)
        const kioskUserId =
          typeof window !== "undefined"
            ? localStorage.getItem("kiosk_user_id") || undefined
            : undefined;

        const res = await fetch("/api/kiosk/companion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyWithoutLast,
            user_id: kioskUserId,
          }),
        });

        const data = await res.json();
        const reply =
          data.reply || "Entschuldigung, da ist etwas schiefgelaufen.";

        // Wenn Server sagt: limitiert
        if (data.limited) {
          setSessionExhausted(true);
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Antwort vorlesen
        speak(reply);
      } catch {
        const errorMsg: ChatMessage = {
          role: "assistant",
          content:
            "Es tut mir leid, ich bin gerade nicht erreichbar. Bitte versuchen Sie es später noch einmal.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [loading, cooldown, sessionExhausted, messages, speak],
  );

  // Spracheingabe starten/stoppen
  const toggleListening = useCallback(() => {
    if (listening) {
      // Stoppen
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setListening(true);

    // Zwischenergebnisse live anzeigen
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      setInput(transcript);

      // Wenn finales Ergebnis: automatisch senden
      if (result[0].isFinal) {
        setListening(false);
        if (transcript.trim()) {
          sendMessage(transcript.trim());
        }
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }, [listening, sendMessage]);

  // Enter-Taste sendet
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Prüfen ob Suggestions angezeigt werden sollen
  // (nach letzter Assistenten-Nachricht oder nur Begrüßung)
  const lastMsg = messages[messages.length - 1];
  const showSuggestions =
    !loading && !sessionExhausted && lastMsg?.role === "assistant";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        padding: "20px 28px 0",
      }}
    >
      {/* Header: Zurück + Titel + TTS-Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <Link href="/kiosk" className="kiosk-back">
          ← Zurück
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>
            🤖 Nachbar KI
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#6b7280",
              margin: "2px 0 0",
            }}
          >
            Ihr digitaler Gesprächspartner
          </p>
        </div>
        {/* TTS-Toggle */}
        {"speechSynthesis" in (typeof window !== "undefined" ? window : {}) ||
        true ? (
          <button
            onClick={() => {
              setTtsEnabled((prev) => {
                if (prev) {
                  window.speechSynthesis?.cancel();
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                  }
                }
                return !prev;
              });
            }}
            style={{
              background: "white",
              border: "1.5px solid #e8ede3",
              borderRadius: "12px",
              color: ttsEnabled ? "#4caf87" : "#9ca3af",
              fontSize: "24px",
              padding: "10px 14px",
              minHeight: "56px",
              minWidth: "56px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            aria-label={
              ttsEnabled
                ? "Sprachausgabe stumm schalten"
                : "Sprachausgabe einschalten"
            }
          >
            {ttsEnabled ? "🔊" : "🔇"}
          </button>
        ) : null}
      </div>

      {/* Chat-Bereich */}
      <div
        className="kiosk-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          paddingBottom: "12px",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`kiosk-chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}

        {/* Tipp-Indikator */}
        {loading && (
          <div className="kiosk-chat-bubble assistant">
            <span
              style={{
                display: "inline-flex",
                gap: "4px",
                fontSize: "24px",
                letterSpacing: "2px",
              }}
            >
              <span style={{ animation: "typing-dot 1.4s infinite 0s" }}>
                .
              </span>
              <span style={{ animation: "typing-dot 1.4s infinite 0.2s" }}>
                .
              </span>
              <span style={{ animation: "typing-dot 1.4s infinite 0.4s" }}>
                .
              </span>
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion-Chips */}
      {showSuggestions && (
        <div
          className="kiosk-scroll"
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            padding: "8px 0",
            flexShrink: 0,
          }}
        >
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              className="kiosk-chip"
              onClick={() => sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Eingabebereich */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "12px 0 20px",
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || sessionExhausted}
          placeholder={
            listening
              ? "Ich höre zu..."
              : sessionExhausted
                ? "Tageslimit erreicht"
                : cooldown
                  ? "Einen Moment bitte..."
                  : "Schreiben oder sprechen Sie..."
          }
          style={{
            flex: 1,
            minHeight: "56px",
            minWidth: 0,
            fontSize: "18px",
            padding: "12px 20px",
            background: "white",
            border: "1.5px solid #e8ede3",
            borderRadius: "16px",
            color: "#2d3142",
            outline: "none",
            transition: "border-color 0.15s ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#4caf87";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e8ede3";
          }}
        />
        {/* Mikrofon-Button (Spracheingabe) */}
        <button
          onClick={toggleListening}
          disabled={loading || sessionExhausted}
          style={{
            minHeight: "56px",
            minWidth: "56px",
            fontSize: "24px",
            background: listening ? "#fef2f2" : "white",
            border: listening ? "2px solid #ef4444" : "1.5px solid #e8ede3",
            borderRadius: "16px",
            cursor: loading || sessionExhausted ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            animation: listening ? "mic-pulse 1.5s infinite" : "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
          aria-label={
            listening ? "Spracherkennung stoppen" : "Spracherkennung starten"
          }
        >
          {listening ? "⏹️" : "🎙️"}
        </button>
        {/* Senden-Button */}
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim() || sessionExhausted}
          style={{
            minHeight: "56px",
            minWidth: "56px",
            padding: "0 24px",
            fontSize: "20px",
            fontWeight: 600,
            background:
              loading || !input.trim() || sessionExhausted
                ? "#d1d5db"
                : "#4caf87",
            color:
              loading || !input.trim() || sessionExhausted
                ? "#9ca3af"
                : "white",
            border: "none",
            borderRadius: "16px",
            cursor:
              loading || !input.trim() || sessionExhausted
                ? "not-allowed"
                : "pointer",
            transition: "all 0.15s ease",
          }}
          aria-label="Nachricht senden"
        >
          Senden
        </button>
      </div>

      {/* Animationen */}
      <style>{`
        @keyframes typing-dot {
          0%, 20% { opacity: 0.2; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0.2; }
        }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 12px 6px rgba(239, 68, 68, 0.15); }
        }
      `}</style>
    </div>
  );
}
