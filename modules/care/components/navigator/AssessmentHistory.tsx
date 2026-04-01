// modules/care/components/navigator/AssessmentHistory.tsx
// Zeigt fruehere Pflegegrad-Einschaetzungen als Karten mit Vergleichsfunktion
"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";

export interface AssessmentRecord {
  id: string;
  created_at: string;
  estimated_grade: number;
  total_weighted: number;
  module_scores: Record<string, number>;
  assessor_role: string;
}

interface AssessmentHistoryProps {
  assessments: AssessmentRecord[];
  currentTotal?: number;
  currentGrade?: number;
}

export function AssessmentHistory({
  assessments,
  currentTotal,
  currentGrade,
}: AssessmentHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);

  if (assessments.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p>Noch keine gespeicherten Einschätzungen vorhanden.</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleCompare = (id: string) => {
    setCompareId((prev) => (prev === id ? null : id));
  };

  // Modul-Kurzbezeichnungen
  const moduleLabels: Record<string, string> = {
    m1: "Mobilität",
    m2: "Kognitiv",
    m3: "Verhalten",
    m4: "Selbstversorgung",
    m5: "Krankheit",
    m6: "Alltag",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-anthrazit flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Frühere Einschätzungen ({assessments.length})
      </h3>

      <div className="space-y-2">
        {assessments.map((assessment) => {
          const isExpanded = expandedId === assessment.id;
          const isComparing = compareId === assessment.id;
          const date = new Date(assessment.created_at).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          // Pflegegrad-Farbe
          const gradeColor =
            assessment.estimated_grade >= 4
              ? "text-red-600"
              : assessment.estimated_grade >= 3
                ? "text-amber-600"
                : assessment.estimated_grade >= 1
                  ? "text-quartier-green"
                  : "text-gray-500";

          return (
            <div key={assessment.id} className="rounded-xl border bg-card overflow-hidden">
              {/* Kopfzeile */}
              <button
                type="button"
                onClick={() => toggleExpand(assessment.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${gradeColor}`}>
                    PG {assessment.estimated_grade}
                  </span>
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">{date}</p>
                    <p className="text-xs text-muted-foreground">
                      {assessment.total_weighted.toFixed(1)} Punkte
                      {assessment.assessor_role === "self" && " (Selbsteinschätzung)"}
                      {assessment.assessor_role === "caregiver" && " (Angehörige)"}
                      {assessment.assessor_role === "care_team" && " (Pflegeteam)"}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t space-y-3">
                  {/* Modul-Rohwerte */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
                    {Object.entries(assessment.module_scores).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">
                          {moduleLabels[key] ?? key}:
                        </span>{" "}
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Vergleich mit aktuellem Ergebnis */}
                  {currentTotal !== undefined && currentGrade !== undefined && (
                    <button
                      type="button"
                      onClick={() => toggleCompare(assessment.id)}
                      className="flex items-center gap-1.5 text-xs text-quartier-green font-medium hover:underline"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      {isComparing ? "Vergleich ausblenden" : "Mit aktuellem Ergebnis vergleichen"}
                    </button>
                  )}

                  {isComparing && currentTotal !== undefined && (
                    <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                      <p className="text-xs font-medium text-anthrazit">Vergleich: Vorher → Aktuell</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Punkte: </span>
                          <span className="font-medium">
                            {assessment.total_weighted.toFixed(1)} → {currentTotal.toFixed(1)}
                          </span>
                          {currentTotal > assessment.total_weighted && (
                            <span className="text-red-500 ml-1 text-xs">(+{(currentTotal - assessment.total_weighted).toFixed(1)})</span>
                          )}
                          {currentTotal < assessment.total_weighted && (
                            <span className="text-green-600 ml-1 text-xs">({(currentTotal - assessment.total_weighted).toFixed(1)})</span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">PG: </span>
                          <span className="font-medium">
                            {assessment.estimated_grade} → {currentGrade}
                          </span>
                        </div>
                      </div>

                      {/* Mini-Balken Vergleich pro Modul */}
                      <div className="space-y-1">
                        {Object.entries(moduleLabels).map(([key, label]) => {
                          const prev = assessment.module_scores[key] ?? 0;
                          return (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className="w-24 text-muted-foreground truncate">{label}</span>
                              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden relative">
                                <div
                                  className="absolute h-full bg-gray-400 rounded-full opacity-50"
                                  style={{ width: `${Math.min(prev * 3, 100)}%` }}
                                />
                              </div>
                              <span className="w-6 text-right font-mono">{prev}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
