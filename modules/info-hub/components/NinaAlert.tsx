"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { useQuarter } from "@/lib/quarters";
import type { NinaWarning } from "../types";

// Dismissed-Warnungen in LocalStorage merken
function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem("nina_dismissed");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissed(ids: Set<string>) {
  try {
    localStorage.setItem("nina_dismissed", JSON.stringify([...ids]));
  } catch {
    // LocalStorage nicht verfuegbar
  }
}

export function NinaAlert() {
  const router = useRouter();
  const { currentQuarter } = useQuarter();
  const quarterId = currentQuarter?.id;
  const [warnings, setWarnings] = useState<NinaWarning[]>([]);
  const [dismissed, setDismissedState] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissedState(getDismissed());
  }, []);

  useEffect(() => {
    if (!quarterId) return;

    fetch(`/api/quartier-info?quarter_id=${quarterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.nina?.length) {
          setWarnings(data.nina);
        }
      })
      .catch(() => {});
  }, [quarterId]);

  const visibleWarnings = warnings.filter((w) => !dismissed.has(w.warning_id));

  if (visibleWarnings.length === 0) return null;

  const handleDismiss = (warningId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(dismissed);
    next.add(warningId);
    setDismissedState(next);
    setDismissed(next);
  };

  return (
    <div className="space-y-2" data-testid="nina-alerts">
      {visibleWarnings.map((warning) => {
        const isHighSeverity =
          warning.severity === "Extreme" || warning.severity === "Severe";
        const bgColor = isHighSeverity
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200";
        const iconColor = isHighSeverity ? "text-red-600" : "text-amber-600";
        const textColor = isHighSeverity ? "text-red-900" : "text-amber-900";

        return (
          <div
            key={warning.warning_id}
            className={`flex items-start gap-3 rounded-xl border ${bgColor} px-4 py-3 cursor-pointer min-h-[48px]`}
            onClick={() => router.push("/quartier-info#warnungen")}
            role="alert"
            data-testid={`nina-alert-${warning.severity.toLowerCase()}`}
          >
            <AlertTriangle
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${textColor}`}>
                {warning.headline}
              </p>
              <p className={`text-xs ${textColor} opacity-80 mt-0.5`}>
                Mehr erfahren →
              </p>
            </div>
            <button
              onClick={(e) => handleDismiss(warning.warning_id, e)}
              className={`flex-shrink-0 p-1 rounded-full hover:bg-black/5 ${iconColor}`}
              aria-label="Warnung ausblenden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
