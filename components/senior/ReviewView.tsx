// components/senior/ReviewView.tsx
// Task H-3/H-4: KI-Vorschlag-View fuer den /schreiben/review/:recipientId Screen.
//
// Zustaende:
//   1. loading    — Spinner, "Formuliere Nachricht..."
//   2. suggestion — KI-Text in grosser Schrift + TTSButton + Aendern + Senden
//   3. editing    — Textarea mit KI-Text, "Fertig"-Button
//   4. error      — Transkript als Fallback mit Amber-Warnung
//
// Senior-UI Regeln:
//   - Action-Buttons: >=56px
//   - Back-Link: >=44px
//   - Text: text-xl
//   - Anthrazit-Farben, rounded-2xl, focus:ring-4

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buildWhatsAppLink } from "@/lib/messaging/whatsapp-link";
import { TTSButton } from "@/modules/voice/components/companion/TTSButton";

type ReviewState = "loading" | "suggestion" | "editing";

/** Erkannter Termin aus der KI-Formulierung (H-6) */
interface DetectedEvent {
  date: string;
  time?: string;
  what: string;
  who: string;
}

export interface ReviewViewProps {
  recipientName: string;
  recipientIndex: number;
  recipientPhone: string;
  transcript: string;
}

export function ReviewView({
  recipientName,
  recipientIndex,
  recipientPhone,
  transcript,
}: ReviewViewProps) {
  const [state, setState] = useState<ReviewState>("loading");
  const [suggestion, setSuggestion] = useState("");
  const [editText, setEditText] = useState("");
  const [kiFailed, setKiFailed] = useState(false);
  const [detectedEvent, setDetectedEvent] = useState<DetectedEvent | null>(
    null,
  );
  const [eventSaved, setEventSaved] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);

  // Aktuell angezeigter Text (KI-Vorschlag oder bearbeiteter Text)
  const currentText = suggestion;

  // KI-Formulierung beim Mount laden
  useEffect(() => {
    let cancelled = false;

    async function formulate() {
      try {
        const res = await fetch("/api/voice/formulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, recipientName }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (cancelled) return;

        setSuggestion(data.text);
        if (data.event) setDetectedEvent(data.event);
        setState("suggestion");
      } catch {
        if (cancelled) return;
        // Fallback: Transkript direkt verwenden
        setSuggestion(transcript);
        setKiFailed(true);
        setState("suggestion");
      }
    }

    formulate();
    return () => {
      cancelled = true;
    };
  }, [transcript, recipientName]);

  // Aendern-Button: Wechsel in Bearbeitungsmodus
  const handleEdit = useCallback(() => {
    setEditText(suggestion);
    setState("editing");
  }, [suggestion]);

  // Fertig-Button: Bearbeiteten Text uebernehmen
  const handleEditDone = useCallback(() => {
    setSuggestion(editText);
    setState("suggestion");
  }, [editText]);

  // Senden-Link: sessionStorage aufraeumen
  const handleSend = useCallback(() => {
    sessionStorage.removeItem(`schreiben_transcript_${recipientIndex}`);
  }, [recipientIndex]);

  // WhatsApp-Link bauen
  const waLink = buildWhatsAppLink(recipientPhone, currentText);

  return (
    <section aria-label="Nachricht pruefen">
      {/* Zurueck-Link */}
      <Link
        href={`/schreiben/mic/${recipientIndex}`}
        className="inline-flex items-center text-base font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40 rounded-xl px-3 py-2"
        style={{ minHeight: "44px" }}
      >
        &larr; Zurueck
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-anthrazit">
        Nachricht an {recipientName}
      </h1>

      {/* Loading */}
      {state === "loading" && (
        <div className="mt-8 flex flex-col items-center gap-6">
          <div
            className="h-16 w-16 animate-spin rounded-full border-4 border-anthrazit/20 border-t-anthrazit"
            role="status"
            aria-label="Formuliere Nachricht"
          />
          <p className="text-lg font-semibold text-anthrazit">
            Formuliere Nachricht...
          </p>
        </div>
      )}

      {/* Suggestion */}
      {state === "suggestion" && (
        <div className="mt-8 flex flex-col gap-6">
          {/* KI-Fehler-Warnung */}
          {kiFailed && (
            <div
              role="alert"
              className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-base text-amber-800"
            >
              Die KI-Formulierung ist gerade nicht verfuegbar. Ihr Original-Text
              wird verwendet.
            </div>
          )}

          {/* Vorschlag-Text */}
          <div className="rounded-2xl border-2 border-anthrazit bg-white p-6">
            <p className="text-xl font-medium text-anthrazit leading-relaxed">
              {currentText}
            </p>
          </div>

          {/* Vorlesen */}
          <TTSButton text={currentText} />

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleEdit}
              className="flex-1 rounded-2xl border-2 border-anthrazit bg-white px-6 py-3 text-base font-semibold text-anthrazit focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
              style={{ minHeight: "56px" }}
            >
              Aendern
            </button>

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleSend}
                className="flex-1 inline-flex items-center justify-center rounded-2xl border-2 border-quartier-green bg-quartier-green px-6 py-3 text-base font-semibold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40 text-center"
                style={{ minHeight: "56px" }}
              >
                Senden
              </a>
            )}
          </div>

          {/* Termin-Erkennung (H-6) */}
          {detectedEvent && !eventSaved && (
            <div className="rounded-2xl border-2 border-quartier-green/50 bg-quartier-green/5 p-4">
              <p className="text-base font-semibold text-anthrazit">
                Termin erkannt: {detectedEvent.what}
                {detectedEvent.time && ` um ${detectedEvent.time} Uhr`}
              </p>
              <button
                type="button"
                disabled={eventSaving}
                onClick={async () => {
                  setEventSaving(true);
                  try {
                    const res = await fetch("/api/circle-events", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        scheduledAt: `${detectedEvent.date}T${detectedEvent.time || "12:00"}:00`,
                        title: `${detectedEvent.what} mit ${detectedEvent.who}`,
                        whoComes: detectedEvent.who,
                      }),
                    });
                    if (res.ok) setEventSaved(true);
                  } catch {
                    // Fehler ignorieren — kein kritischer Flow
                  } finally {
                    setEventSaving(false);
                  }
                }}
                className="mt-3 w-full rounded-2xl border-2 border-quartier-green bg-quartier-green px-6 py-3 text-base font-semibold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
                style={{ minHeight: "56px" }}
              >
                {eventSaving ? "Wird eingetragen..." : "Termin eintragen"}
              </button>
            </div>
          )}

          {eventSaved && (
            <div className="rounded-2xl border-2 border-quartier-green/50 bg-quartier-green/10 p-4 text-base font-semibold text-quartier-green">
              Termin eingetragen!
            </div>
          )}
        </div>
      )}

      {/* Editing */}
      {state === "editing" && (
        <div className="mt-8 flex flex-col gap-6">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full rounded-2xl border-2 border-anthrazit bg-white p-4 text-xl text-anthrazit leading-relaxed focus:outline-none focus:ring-4 focus:ring-quartier-green/40 resize-y"
            style={{ minHeight: "120px" }}
            aria-label="Nachricht bearbeiten"
          />
          <button
            type="button"
            onClick={handleEditDone}
            className="rounded-2xl border-2 border-quartier-green bg-quartier-green px-6 py-3 text-base font-semibold text-white focus:outline-none focus:ring-4 focus:ring-quartier-green/40"
            style={{ minHeight: "56px" }}
          >
            Fertig
          </button>
        </div>
      )}
    </section>
  );
}
