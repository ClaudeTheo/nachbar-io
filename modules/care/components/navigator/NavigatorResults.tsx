// modules/care/components/navigator/NavigatorResults.tsx
// Ergebnisseite mit Charts, Disclaimer, Speichern und Pflegetagebuch
"use client";

import { useState } from "react";
import { Save, ArrowLeft, Loader2, AlertTriangle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ModuleScores } from "../../lib/nba-scoring";
import {
  calculateTotalWeighted,
  estimatePflegegrad,
  getDetailedWeightedScores,
} from "../../lib/nba-scoring";
import { PflegegradBar } from "./PflegegradBar";
import { ModuleBarChart } from "./ModuleBarChart";
import { NbaRadarChart } from "./NbaRadarChart";
import { PreparationChecklist } from "./PreparationChecklist";
import { PflegetagebuchPdf } from "./PflegetagebuchPdf";
import { AssessmentHistory, type AssessmentRecord } from "./AssessmentHistory";

interface NavigatorResultsProps {
  scores: ModuleScores;
  userId: string;
  previousAssessments: AssessmentRecord[];
  onBack: () => void;
}

export function NavigatorResults({
  scores,
  userId,
  previousAssessments,
  onBack,
}: NavigatorResultsProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeighted = calculateTotalWeighted(scores);
  const pflegegrad = estimatePflegegrad(totalWeighted);
  const detailed = getDetailedWeightedScores(scores);

  // Ergebnis in Supabase speichern
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("pflegegrad_assessments")
        .insert({
          user_id: userId,
          assessor_id: userId,
          assessor_role: "self",
          module_scores: scores,
          total_raw: scores.m1 + scores.m2 + scores.m3 + scores.m4 + scores.m5 + scores.m6,
          total_weighted: totalWeighted,
          estimated_grade: pflegegrad,
        });

      if (insertError) throw insertError;
      setSaved(true);
    } catch (err) {
      console.error("Speichern fehlgeschlagen:", err);
      setError("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer — NICHT schliessbar */}
      <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">
              Wichtiger Hinweis
            </p>
            <p className="text-sm text-red-700 mt-1">
              Dieses Tool dient ausschließlich der Orientierung. Es ersetzt NICHT die offizielle
              Begutachtung durch den Medizinischen Dienst (MD).
            </p>
            <p className="flex items-center gap-1.5 text-sm font-medium text-red-800 mt-2">
              <Phone className="h-4 w-4" />
              Kostenlose Beratung: 030 340 60 66-02
            </p>
          </div>
        </div>
      </div>

      {/* Pflegegrad-Balken */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <PflegegradBar score={totalWeighted} pflegegrad={pflegegrad} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <NbaRadarChart weightedScores={detailed.modules} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <ModuleBarChart weightedScores={detailed.modules} />
        </div>
      </div>

      {/* Aktionen */}
      <div className="space-y-3">
        {/* Ergebnis speichern */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className={`
            w-full min-h-[56px] px-4 py-3 rounded-xl
            text-sm font-medium transition-colors
            flex items-center justify-center gap-2
            ${
              saved
                ? "bg-quartier-green text-white"
                : "bg-anthrazit text-white hover:bg-anthrazit/90"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Wird gespeichert...
            </>
          ) : saved ? (
            <>
              <Save className="h-5 w-5" />
              Ergebnis gespeichert
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Ergebnis speichern
            </>
          )}
        </button>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        {/* Pflegetagebuch PDF */}
        <PflegetagebuchPdf />

        {/* Zurueck zum Fragebogen */}
        <button
          type="button"
          onClick={onBack}
          className="
            w-full min-h-[48px] px-4 py-3 rounded-xl
            border-2 border-gray-200
            text-sm font-medium text-muted-foreground
            hover:bg-gray-50 transition-colors
            flex items-center justify-center gap-2
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Fragebogen
        </button>
      </div>

      {/* Vorbereitungs-Checkliste */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <PreparationChecklist />
      </div>

      {/* Fruehere Einschaetzungen */}
      {previousAssessments.length > 0 && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <AssessmentHistory
            assessments={previousAssessments}
            currentTotal={totalWeighted}
            currentGrade={pflegegrad}
          />
        </div>
      )}
    </div>
  );
}
