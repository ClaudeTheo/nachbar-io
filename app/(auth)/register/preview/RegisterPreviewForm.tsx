"use client";

import { useCallback, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KiHelpOnboardingHint } from "@/components/ki-help/KiHelpOnboardingHint";
import {
  RegisterStepIdentity,
  RegisterStepPilotRole,
  RegisterStepAiConsent,
} from "../components";
import type { RegisterFormState, Step } from "../components";

const LOCAL_PREVIEW_OPTIONS: Array<{ step: Step; label: string; href: string }> = [
  { step: "identity", label: "Vorschau Schritt 2", href: "/register/preview/identity" },
  { step: "pilot_role", label: "Vorschau Schritt 3", href: "/register/preview/pilot-role" },
  { step: "ai_consent", label: "Vorschau Schritt 4", href: "/register/preview/ai-consent" },
];

function buildLocalPreviewState(): RegisterFormState {
  return {
    email: "test.person@example.invalid",
    displayName: "Test Person",
    firstName: "Test",
    lastName: "Person",
    dateOfBirth: "1948-01-01",
    inviteCode: "",
    householdId: null,
    referrerId: null,
    verificationMethod: "address_manual",
    selectedAddress: {
      street: "Purkersdorfer Straße",
      postalCode: "79713",
      city: "Bad Säckingen",
      state: "Baden-Württemberg",
      country: "DE",
      lat: 47.553,
      lng: 7.946,
      displayText: "Purkersdorfer Straße, 79713 Bad Säckingen",
    },
    houseNumber: "12",
    postalCode: "79713",
    city: "Bad Säckingen",
    geoQuarter: {
      quarter_id: "local-preview-bad-saeckingen",
      quarter_name: "Bad Säckingen",
      action: "preview",
    },
    pilotRole: "test_user",
    loading: false,
    geoLoading: false,
    error: null,
    aiConsentChoice: "later",
  };
}

export function RegisterPreviewForm({ initialStep }: { initialStep: Step }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [formState, setFormState] = useState<RegisterFormState>(() => buildLocalPreviewState());

  const updateState = useCallback(
    (updater: Partial<RegisterFormState> | ((prev: RegisterFormState) => Partial<RegisterFormState>)) => {
      setFormState((prev) => {
        const partial = typeof updater === "function" ? updater(prev) : updater;
        return { ...prev, ...partial };
      });
    },
    [],
  );

  const totalSteps = 4;
  const currentStep = (() => {
    if (step === "identity") return 2;
    if (step === "pilot_role") return 3;
    return 4;
  })();

  return (
    <Card className="overflow-hidden border border-quartier-green/10 bg-white/95 shadow-2xl shadow-anthrazit/10">
      <CardHeader className="relative text-center">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-quartier-green" />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-quartier-green/10 text-quartier-green shadow-sm">
          <HeartHandshake className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-quartier-green">
          QuartierApp
        </p>
        <CardTitle className="mt-1 text-2xl leading-tight text-anthrazit">
          Gute Nachbarschaft beginnt mit einem kleinen Schritt
        </CardTitle>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Ein geschlossener Pilot für Bad Säckingen, damit Hilfe, Familie und
          Quartier leichter zusammenfinden.
        </p>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < currentStep ? "bg-quartier-green" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Schritt {currentStep} von {totalSteps}
        </p>
        <KiHelpOnboardingHint step={step} />
        <div className="mt-3 flex flex-wrap justify-center gap-2 rounded-lg border border-dashed border-quartier-green/30 bg-quartier-green/5 p-2">
          {LOCAL_PREVIEW_OPTIONS.map(({ step: previewStep, label, href }) => (
            <a
              key={previewStep}
              href={href}
              className="rounded-md border border-quartier-green/30 bg-white px-2.5 py-1.5 text-xs font-medium text-quartier-green transition-colors hover:bg-quartier-green/10"
            >
              {label}
            </a>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {step === "identity" && (
          <RegisterStepIdentity state={formState} setState={updateState} setStep={setStep} />
        )}
        {step === "pilot_role" && (
          <RegisterStepPilotRole state={formState} setState={updateState} setStep={setStep} />
        )}
        {step === "ai_consent" && (
          <RegisterStepAiConsent state={formState} setState={updateState} setStep={setStep} />
        )}
      </CardContent>
    </Card>
  );
}
