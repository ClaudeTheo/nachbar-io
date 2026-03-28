"use client";

// components/voice-assistant/ToolResultsDisplay.tsx
// Nachbar.io — Anzeige von Tool-Ergebnissen und Bestaetigungen

import { Check, TriangleAlert, Navigation } from "lucide-react";
import type { CompanionToolResult, CompanionConfirmation } from "./types";

interface ToolResultsDisplayProps {
  /** Tool-Ergebnisse vom Companion */
  toolResults: CompanionToolResult[];
  /** Bestaetigungen (Write-Actions) */
  confirmations: CompanionConfirmation[];
  /** Handler: Navigation zu einer Route */
  onNavigate: (route: string) => void;
  /** Handler: Tool-Bestaetigung ausfuehren */
  onConfirm: (confirmation: CompanionConfirmation) => void;
}

/** Zeigt Tool-Ergebnisse (ActionCards) und Bestaetigungen (ConfirmationCards) */
export function ToolResultsDisplay({
  toolResults,
  confirmations,
  onNavigate,
  onConfirm,
}: ToolResultsDisplayProps) {
  return (
    <>
      {/* Tool-Ergebnisse (ActionCards) */}
      {toolResults.length > 0 && (
        <div className="space-y-2" data-testid="tool-results">
          {toolResults.map((result, i) => (
            <div
              key={i}
              className="rounded-lg border p-3 flex items-start gap-3"
            >
              <div
                className={`mt-0.5 ${result.success ? "text-[#4CAF87]" : "text-[#F59E0B]"}`}
              >
                {result.success ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <TriangleAlert className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#2D3142]">
                  {result.summary}
                </p>
                {result.route && (
                  <button
                    onClick={() => onNavigate(result.route!)}
                    className="mt-2 flex items-center gap-1 text-sm text-[#4CAF87] font-medium hover:underline"
                  >
                    <Navigation className="h-4 w-4" />
                    Zur Seite
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bestaetigungen (ConfirmationCards) */}
      {confirmations.length > 0 && (
        <div className="space-y-2" data-testid="confirmations">
          {confirmations.map((conf, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3"
            >
              <p className="text-sm text-[#2D3142] mb-2">
                {conf.description}
              </p>
              <button
                onClick={() => onConfirm(conf)}
                data-testid={`confirm-btn-${i}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4CAF87] text-white font-medium text-sm transition-all hover:bg-[#4CAF87]/90 active:scale-95"
                style={{
                  minHeight: "44px",
                  touchAction: "manipulation",
                }}
              >
                <Check className="h-4 w-4" />
                Bestätigen
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
