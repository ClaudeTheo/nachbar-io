"use client";

import type { Step } from "@/app/(auth)/register/components/types";
import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
import { getRegisterTourHint } from "@/lib/ki-help/register-tour-content";

interface KiHelpOnboardingHintProps {
  step: Step;
}

export function KiHelpOnboardingHint({ step }: KiHelpOnboardingHintProps) {
  return (
    <div className="mt-3 rounded-xl border border-quartier-green/20 bg-quartier-green/5 p-3 text-left">
      <div className="flex items-start gap-3">
        <KiHelpPulseDot className="mt-0.5" />
        <p className="text-sm leading-relaxed text-anthrazit">
          {getRegisterTourHint(step)}
        </p>
      </div>
    </div>
  );
}
