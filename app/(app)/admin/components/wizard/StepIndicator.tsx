import {
  MapPin, Settings, Map, CircleCheckBig, FileText,
} from "lucide-react";

// -------------------------------------------------------------------
// Fortschrittsanzeige (Schrittindikator oben im Wizard)
// -------------------------------------------------------------------

const STEPS = [
  { label: "Grunddaten", icon: FileText },
  { label: "Standort", icon: MapPin },
  { label: "Konfiguration", icon: Settings },
  { label: "Karte", icon: Map },
  { label: "Übersicht", icon: CircleCheckBig },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between px-2">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const Icon = step.icon;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  isDone
                    ? "border-quartier-green bg-quartier-green text-white"
                    : isActive
                    ? "border-quartier-green bg-green-50 text-quartier-green"
                    : "border-gray-200 bg-white text-gray-400"
                }`}
              >
                {isDone ? (
                  <CircleCheckBig className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`mt-1 text-[10px] ${
                  isActive ? "font-semibold text-anthrazit" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Verbindungslinie */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-6 sm:w-10 ${
                  stepNum < currentStep ? "bg-quartier-green" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
