"use client";

// Praevention — PSS-10 Fragebogen (Perceived Stress Scale)
// Validierte deutsche Uebersetzung (Cohen, Kamarck & Mermelstein, 1983)
// Senior-tauglich: 1 Frage pro Bildschirm, grosse Buttons, Fortschrittsanzeige

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

// 10 Items der PSS-10 (deutsche validierte Uebersetzung)
// Items 4, 5, 7, 8 sind positiv formuliert (invertierte Bewertung)
const PSS10_ITEMS = [
  {
    id: 1,
    text: "Wie oft hatten Sie sich im letzten Monat darüber aufgeregt, dass etwas unerwartet passiert ist?",
    inverted: false,
  },
  {
    id: 2,
    text: "Wie oft hatten Sie im letzten Monat das Gefühl, wichtige Dinge in Ihrem Leben nicht kontrollieren zu können?",
    inverted: false,
  },
  {
    id: 3,
    text: "Wie oft haben Sie sich im letzten Monat nervös und gestresst gefühlt?",
    inverted: false,
  },
  {
    id: 4,
    text: "Wie oft hatten Sie im letzten Monat das Gefühl, mit Ihren persönlichen Problemen erfolgreich umgehen zu können?",
    inverted: true,
  },
  {
    id: 5,
    text: "Wie oft hatten Sie im letzten Monat das Gefühl, dass sich die Dinge nach Ihren Vorstellungen entwickeln?",
    inverted: true,
  },
  {
    id: 6,
    text: "Wie oft haben Sie im letzten Monat gemerkt, dass Sie mit all den anstehenden Aufgaben nicht zurechtkommen?",
    inverted: false,
  },
  {
    id: 7,
    text: "Wie oft konnten Sie sich im letzten Monat über Dinge freuen, die Ihnen widerfahren sind?",
    inverted: true,
  },
  {
    id: 8,
    text: "Wie oft hatten Sie im letzten Monat das Gefühl, alles im Griff zu haben?",
    inverted: true,
  },
  {
    id: 9,
    text: "Wie oft haben Sie sich im letzten Monat darüber geärgert, dass Dinge außerhalb Ihrer Kontrolle lagen?",
    inverted: false,
  },
  {
    id: 10,
    text: "Wie oft hatten Sie im letzten Monat das Gefühl, dass sich die Schwierigkeiten so aufgetürmt haben, dass Sie sie nicht mehr bewältigen konnten?",
    inverted: false,
  },
];

// 5-stufige Likert-Skala
const LIKERT_OPTIONS = [
  { value: 0, label: "Nie" },
  { value: 1, label: "Selten" },
  { value: 2, label: "Manchmal" },
  { value: 3, label: "Häufig" },
  { value: 4, label: "Sehr oft" },
];

interface PSS10FormProps {
  /** Pre oder Post Messung */
  measurementType: "pre" | "post";
  /** Callback mit Gesamt-Score (0-40) */
  onComplete: (score: number) => void;
  /** Abbrechen */
  onCancel: () => void;
}

export default function PSS10Form({
  measurementType,
  onComplete,
  onCancel,
}: PSS10FormProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(10).fill(null),
  );
  const [submitting, setSubmitting] = useState(false);

  const currentItem = PSS10_ITEMS[currentIndex];
  const currentAnswer = answers[currentIndex];
  const allAnswered = answers.every((a) => a !== null);

  // Antwort setzen
  const handleAnswer = (value: number) => {
    const updated = [...answers];
    updated[currentIndex] = value;
    setAnswers(updated);

    // Automatisch weiter nach kurzer Pause
    if (currentIndex < 9) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 300);
    }
  };

  // Score berechnen
  const calculateScore = (): number => {
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const answer = answers[i] ?? 0;
      const item = PSS10_ITEMS[i];
      // Invertierte Items: 0→4, 1→3, 2→2, 3→1, 4→0
      total += item.inverted ? 4 - answer : answer;
    }
    return total;
  };

  // Abschicken
  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    const score = calculateScore();
    onComplete(score);
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="rounded-lg p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-semibold text-gray-800">
            Stress-Fragebogen (PSS-10)
          </h1>
          <p className="text-xs text-gray-500">
            {measurementType === "pre" ? "Vor dem Kurs" : "Nach dem Kurs"} —
            Frage {currentIndex + 1} von 10
          </p>
        </div>
      </div>

      {/* Fortschrittsbalken */}
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              answers[i] !== null
                ? "bg-emerald-500"
                : i === currentIndex
                  ? "bg-emerald-200"
                  : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Frage */}
      <div className="min-h-[120px] rounded-2xl bg-gray-50 p-6">
        <p className="text-lg leading-relaxed text-gray-800">
          {currentItem.text}
        </p>
      </div>

      {/* Antwort-Buttons (grosse Touch-Targets) */}
      <div className="flex flex-col gap-3">
        {LIKERT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleAnswer(option.value)}
            className={`flex h-14 items-center rounded-xl border-2 px-6 text-left text-base font-medium transition-all active:scale-[0.98] ${
              currentAnswer === option.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">
              {option.value}
            </span>
            {option.label}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        {currentIndex < 9 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={currentAnswer === null}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:bg-gray-300"
          >
            Weiter
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:bg-gray-300"
          >
            <Check className="h-4 w-4" />
            {submitting ? "Wird gespeichert..." : "Abschicken"}
          </button>
        )}
      </div>

      {/* Hinweis */}
      <p className="text-center text-xs text-gray-400">
        Ihre Antworten werden vertraulich behandelt und verschlüsselt
        gespeichert.
      </p>
    </div>
  );
}
