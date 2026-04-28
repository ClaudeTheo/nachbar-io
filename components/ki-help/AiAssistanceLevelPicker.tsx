"use client";

import { CheckCircle2, Lock } from "lucide-react";
import {
  getLevelOptionsForMode,
  type AiAssistanceLevel,
  type AiAssistanceLevelMode,
} from "@/lib/ki-help/ai-assistance-levels";

interface AiAssistanceLevelPickerProps {
  value: AiAssistanceLevel | null;
  onChange: (level: AiAssistanceLevel) => void;
  mode: AiAssistanceLevelMode;
  onLockedClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AiAssistanceLevelPicker({
  value,
  onChange,
  mode,
  onLockedClick,
  disabled = false,
  className,
}: AiAssistanceLevelPickerProps) {
  const options = getLevelOptionsForMode(mode);
  const lockDisabled = mode === "onboarding" || disabled;

  return (
    <div className={"grid gap-3 " + (className ?? "")}>
      {options.map(({ level, label, description, icon: Icon }) => (
        <button
          key={level}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level)}
          className={`min-h-[80px] w-full rounded-lg border-2 p-4 text-left transition-colors ${
            value === level
              ? "border-quartier-green bg-quartier-green/5"
              : "border-border hover:border-quartier-green/50"
          }`}
          aria-pressed={value === level}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
              <Icon className="h-5 w-5 text-quartier-green" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-anthrazit">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            {value === level && (
              <CheckCircle2
                className="mt-1 h-5 w-5 shrink-0 text-quartier-green"
                aria-hidden="true"
              />
            )}
          </div>
        </button>
      ))}

      <button
        type="button"
        aria-disabled="true"
        disabled={lockDisabled}
        onClick={() => {
          if (!disabled) onLockedClick?.();
        }}
        className="min-h-[80px] w-full cursor-not-allowed rounded-lg border-2 border-dashed border-border/60 bg-muted/30 p-4 text-left opacity-70"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-anthrazit">Persönlich (später)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nur mit ausdrücklicher Einwilligung und aktiven Schutzmaßnahmen,
              kommt mit Phase 2 nach Freigabe.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
