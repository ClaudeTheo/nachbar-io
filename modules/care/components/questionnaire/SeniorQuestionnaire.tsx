"use client";

// KI-Fragebogen: Schrittweises Formular mit 1 Frage pro Card
// Speichert Antworten als user_memory_facts nach Einwilligungs-Check

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check, Brain, Loader2 } from "lucide-react";
import { QUESTIONNAIRE_QUESTIONS, type QuestionDefinition } from "./questions";

interface SeniorQuestionnaireProps {
  userId: string;
  existingFacts: Record<string, string>;
  hasConsent: boolean;
}

export function SeniorQuestionnaire({
  userId,
  existingFacts,
  hasConsent: initialConsent,
}: SeniorQuestionnaireProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [hasConsent, setHasConsent] = useState(initialConsent);
  const [consentLoading, setConsentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vorhandene Antworten in den State laden
  useEffect(() => {
    const prefilled: Record<number, string> = {};
    for (const q of QUESTIONNAIRE_QUESTIONS) {
      const existing = existingFacts[`${q.memory_category}:${q.memory_key}`];
      if (existing) {
        prefilled[q.id] = existing;
      }
    }
    if (Object.keys(prefilled).length > 0) {
      setAnswers(prefilled);
    }
  }, [existingFacts]);

  // Einwilligung erteilen
  const grantConsent = useCallback(async () => {
    setConsentLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/memory/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_type: "memory_basis" }),
      });
      if (!res.ok) {
        setError("Einwilligung konnte nicht gespeichert werden.");
        return;
      }
      setHasConsent(true);
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setConsentLoading(false);
    }
  }, []);

  // Alle Antworten speichern
  const saveAllAnswers = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const facts = QUESTIONNAIRE_QUESTIONS.filter((q) =>
        answers[q.id]?.trim(),
      ).map((q) => ({
        category: q.memory_category,
        key: q.memory_key,
        value: answers[q.id].trim(),
        source: "ki_fragebogen",
      }));

      if (facts.length === 0) {
        setDone(true);
        return;
      }

      const res = await fetch("/api/memory/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, targetUserId: userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Speichern fehlgeschlagen.");
        return;
      }
      setDone(true);
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  }, [answers, userId]);

  const totalQuestions = QUESTIONNAIRE_QUESTIONS.length;
  const currentQuestion: QuestionDefinition | undefined =
    QUESTIONNAIRE_QUESTIONS[step];
  const answeredCount = Object.values(answers).filter((v) => v?.trim()).length;

  // Einwilligungs-Screen
  if (!hasConsent) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4CAF87]/10">
              <Brain className="h-6 w-6 text-[#4CAF87]" />
            </div>
            <h2 className="text-xl font-bold text-[#2D3142]">KI-Gedächtnis</h2>
          </div>
          <p className="mb-4 text-gray-600">
            Möchten Sie, dass die KI sich an Ihre Antworten erinnert? So kann
            sie Sie besser unterstützen und auf Ihre Wünsche eingehen.
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Sie können Ihre Einwilligung jederzeit in den Einstellungen
            widerrufen. Ihre Daten werden ausschließlich für Sie gespeichert.
          </p>
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={grantConsent}
              disabled={consentLoading}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#4CAF87] px-6 font-semibold text-white transition-colors hover:bg-[#3d9a74] disabled:opacity-50"
            >
              {consentLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Ja, einverstanden
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Erfolgs-Screen
  if (done) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#4CAF87]/10">
            <Check className="h-8 w-8 text-[#4CAF87]" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[#2D3142]">
            Vielen Dank!
          </h2>
          <p className="mb-4 text-gray-600">
            {answeredCount} von {totalQuestions} Fragen beantwortet. Die KI
            kennt Sie jetzt besser.
          </p>
          <div className="space-y-2 text-left">
            {QUESTIONNAIRE_QUESTIONS.filter((q) => answers[q.id]?.trim()).map(
              (q) => (
                <div
                  key={q.id}
                  className="rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-gray-700">{q.label}</span>
                  <br />
                  <span className="text-gray-500">{answers[q.id]}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Fortschritts-Dots */}
      <div className="flex items-center justify-center gap-1.5">
        {QUESTIONNAIRE_QUESTIONS.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setStep(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              i === step
                ? "bg-[#4CAF87] scale-125"
                : answers[q.id]?.trim()
                  ? "bg-[#4CAF87]/40"
                  : "bg-gray-200"
            }`}
            aria-label={`Frage ${i + 1}`}
          />
        ))}
      </div>

      {/* Frage-Zaehler */}
      <p className="text-center text-sm text-gray-500">
        Frage {step + 1} von {totalQuestions}
      </p>

      {/* Frage-Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="mb-4 block text-lg font-semibold text-[#2D3142]">
          {currentQuestion.label}
        </label>

        {currentQuestion.input_type === "select" && currentQuestion.options ? (
          <div className="space-y-2">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt }))
                }
                className={`flex min-h-[52px] w-full items-center rounded-xl border-2 px-4 text-left font-medium transition-colors ${
                  answers[currentQuestion.id] === opt
                    ? "border-[#4CAF87] bg-[#4CAF87]/5 text-[#2D3142]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : currentQuestion.input_type === "textarea" ? (
          <textarea
            value={answers[currentQuestion.id] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: e.target.value,
              }))
            }
            placeholder={currentQuestion.placeholder}
            rows={4}
            className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 text-base text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none"
          />
        ) : (
          <input
            type="text"
            value={answers[currentQuestion.id] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                [currentQuestion.id]: e.target.value,
              }))
            }
            placeholder={currentQuestion.placeholder}
            className="min-h-[52px] w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base text-[#2D3142] placeholder:text-gray-400 focus:border-[#4CAF87] focus:outline-none"
          />
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex min-h-[52px] items-center justify-center gap-1 rounded-xl border-2 border-gray-200 px-4 font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
          Zurück
        </button>

        {step < totalQuestions - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(totalQuestions - 1, s + 1))}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-1 rounded-xl bg-[#2D3142] px-6 font-semibold text-white transition-colors hover:bg-[#3d4256]"
          >
            Weiter
            <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={saveAllAnswers}
            disabled={saving || answeredCount === 0}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#4CAF87] px-6 font-semibold text-white transition-colors hover:bg-[#3d9a74] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Abschließen ({answeredCount}/{totalQuestions})
              </>
            )}
          </button>
        )}
      </div>

      {/* Ueberspringen-Link */}
      {step < totalQuestions - 1 && (
        <p className="text-center">
          <button
            onClick={() => setStep((s) => s + 1)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Frage überspringen
          </button>
        </p>
      )}
    </div>
  );
}
