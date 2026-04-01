// modules/care/components/navigator/ModuleQuestions.tsx
// Rendert die Fragen fuer ein einzelnes NBA-Modul
"use client";

import { useCallback } from "react";
import type { NbaQuestion } from "./nba-questions";

interface ModuleQuestionsProps {
  questions: NbaQuestion[];
  answers: Record<string, number>;
  onAnswer: (questionId: string, value: number) => void;
}

export function ModuleQuestions({ questions, answers, onAnswer }: ModuleQuestionsProps) {
  const handleSelect = useCallback(
    (questionId: string, value: number) => {
      onAnswer(questionId, value);
    },
    [onAnswer],
  );

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <div
          key={question.id}
          className="rounded-xl border bg-card p-4 sm:p-5"
        >
          {/* Fragennummer + Label */}
          <div className="mb-2">
            <p className="text-base font-semibold text-anthrazit leading-snug">
              <span className="text-quartier-green mr-1.5">{index + 1}.</span>
              {question.label}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {question.description}
            </p>
          </div>

          {/* Antwort-Optionen als Radio-Buttons mit grossen Touch-Targets */}
          <div className="mt-3 space-y-2">
            {question.scale.map((option) => {
              const isSelected = answers[question.id] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(question.id, option.value)}
                  className={`
                    w-full min-h-[56px] sm:min-h-[48px] px-4 py-3 rounded-lg
                    text-left text-sm font-medium
                    border-2 transition-all duration-150
                    ${
                      isSelected
                        ? "border-quartier-green bg-quartier-green/10 text-anthrazit"
                        : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300 hover:bg-gray-50"
                    }
                  `}
                  aria-pressed={isSelected}
                >
                  <span className="flex items-center gap-3">
                    {/* Radio-Indikator */}
                    <span
                      className={`
                        inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0
                        ${isSelected ? "border-quartier-green" : "border-gray-300"}
                      `}
                    >
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-quartier-green" />
                      )}
                    </span>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
