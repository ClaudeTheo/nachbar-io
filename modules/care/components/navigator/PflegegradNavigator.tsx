// modules/care/components/navigator/PflegegradNavigator.tsx
// Stepped Wizard: 6 Schritte (1 pro NBA-Modul) mit Auswertung
"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight, ClipboardCheck } from "lucide-react";
import {
  MODULE_DEFINITIONS,
  getQuestionsForModule,
  calculateModuleRawScore,
} from "./nba-questions";
import type { ModuleScores } from "../../lib/nba-scoring";
import { ModuleQuestions } from "./ModuleQuestions";
import { NavigatorResults } from "./NavigatorResults";
import type { AssessmentRecord } from "./AssessmentHistory";

interface PflegegradNavigatorProps {
  userId: string;
  previousAssessments: AssessmentRecord[];
}

export function PflegegradNavigator({
  userId,
  previousAssessments,
}: PflegegradNavigatorProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0-5 = Module, 6 = Ergebnis
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const totalSteps = MODULE_DEFINITIONS.length; // 6
  const currentModule = MODULE_DEFINITIONS[currentStep];
  const currentQuestions = useMemo(
    () => (currentModule ? getQuestionsForModule(currentModule.module) : []),
    [currentModule],
  );

  // Pruefen ob alle Fragen des aktuellen Moduls beantwortet sind
  const allCurrentAnswered = useMemo(() => {
    if (!currentModule) return false;
    return currentQuestions.every((q) => answers[q.id] !== undefined);
  }, [currentQuestions, answers, currentModule]);

  // Antwort setzen
  const handleAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  // Modulscores berechnen
  const moduleScores: ModuleScores = useMemo(() => {
    return {
      m1: calculateModuleRawScore(1, answers),
      m2: calculateModuleRawScore(2, answers),
      m3: calculateModuleRawScore(3, answers),
      m4: calculateModuleRawScore(4, answers),
      m5: calculateModuleRawScore(5, answers),
      m6: calculateModuleRawScore(6, answers),
    };
  }, [answers]);

  // Navigation
  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goPrev = () => {
    if (showResults) {
      setShowResults(false);
      setCurrentStep(totalSteps - 1);
    } else if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const showEvaluation = () => {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Ergebnisseite
  if (showResults) {
    return (
      <NavigatorResults
        scores={moduleScores}
        userId={userId}
        previousAssessments={previousAssessments}
        onBack={goPrev}
      />
    );
  }

  // Fortschritt berechnen (alle beantworteten Fragen / alle Fragen gesamt)
  const totalQuestions = MODULE_DEFINITIONS.reduce(
    (sum, def) => sum + getQuestionsForModule(def.module).length,
    0,
  );
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="space-y-6">
      {/* Fortschrittsbalken */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Modul {currentStep + 1} von {totalSteps}
          </span>
          <span>
            {answeredCount} von {totalQuestions} Fragen beantwortet
          </span>
        </div>

        {/* Modul-Schritte */}
        <div className="flex gap-1">
          {MODULE_DEFINITIONS.map((def, idx) => {
            const questions = getQuestionsForModule(def.module);
            const answered = questions.filter((q) => answers[q.id] !== undefined).length;
            const complete = answered === questions.length;
            const isCurrent = idx === currentStep;

            return (
              <button
                key={def.module}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`
                  flex-1 h-2 rounded-full transition-all duration-300
                  ${isCurrent ? "bg-quartier-green" : complete ? "bg-quartier-green/60" : "bg-gray-200"}
                `}
                title={`${def.shortTitle} (${answered}/${questions.length})`}
              />
            );
          })}
        </div>

        {/* Gesamt-Fortschritt */}
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-quartier-green/40 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Modul-Header */}
      {currentModule && (
        <div className="rounded-xl bg-quartier-green/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-quartier-green text-white text-sm font-bold">
              {currentModule.module}
            </span>
            <h2 className="text-base font-bold text-anthrazit">
              {currentModule.title}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-9">
            {currentModule.description}
          </p>
          <p className="text-xs text-quartier-green font-medium ml-9 mt-1">
            Gewichtung: {currentModule.weight}
          </p>
        </div>
      )}

      {/* Fragen */}
      <ModuleQuestions
        questions={currentQuestions}
        answers={answers}
        onAnswer={handleAnswer}
      />

      {/* Navigation */}
      <div className="flex gap-3 pt-2 pb-4">
        {/* Zurueck */}
        <button
          type="button"
          onClick={goPrev}
          disabled={currentStep === 0}
          className={`
            min-h-[56px] px-5 py-3 rounded-xl
            border-2 border-gray-200
            text-sm font-medium text-muted-foreground
            hover:bg-gray-50 transition-colors
            flex items-center gap-2
            disabled:opacity-30 disabled:cursor-not-allowed
          `}
        >
          <ArrowLeft className="h-5 w-5" />
          Zurück
        </button>

        {/* Weiter oder Auswertung */}
        {isLastStep ? (
          <button
            type="button"
            onClick={showEvaluation}
            className="
              flex-1 min-h-[56px] px-5 py-3 rounded-xl
              bg-quartier-green text-white
              text-sm font-bold
              hover:bg-quartier-green/90 transition-colors
              flex items-center justify-center gap-2
            "
          >
            <ClipboardCheck className="h-5 w-5" />
            Auswertung anzeigen
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!allCurrentAnswered}
            className={`
              flex-1 min-h-[56px] px-5 py-3 rounded-xl
              text-sm font-bold transition-colors
              flex items-center justify-center gap-2
              ${
                allCurrentAnswered
                  ? "bg-anthrazit text-white hover:bg-anthrazit/90"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            Weiter
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
