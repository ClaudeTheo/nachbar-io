"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KiHelpOnboardingHint } from "@/components/ki-help/KiHelpOnboardingHint";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode } from "@/lib/invite-codes";
import { OtpCodeEntry } from "@/components/auth/OtpCodeEntry";
import {
  RegisterStepEntry,
  RegisterStepInvite,
  RegisterStepAddress,
  RegisterStepIdentity,
  RegisterStepPilotRole,
  RegisterStepAiConsent,
} from "./components";
import type { Step, RegisterFormState } from "./components";

const LOCAL_PREVIEW_OPTIONS: Array<{ step: Step; label: string; href: string }> = [
  { step: "identity", label: "Vorschau Schritt 2", href: "/register/preview/identity" },
  { step: "pilot_role", label: "Vorschau Schritt 3", href: "/register/preview/pilot-role" },
  { step: "ai_consent", label: "Vorschau Schritt 4", href: "/register/preview/ai-consent" },
];
const LOCAL_PREVIEW_STEPS = LOCAL_PREVIEW_OPTIONS.map(({ step }) => step);

function buildInitialFormState(): RegisterFormState {
  return {
    email: "",
    displayName: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    inviteCode: "",
    householdId: null,
    referrerId: null,
    verificationMethod: "invite_code",
    selectedAddress: null,
    houseNumber: "",
    postalCode: "",
    city: "",
    geoQuarter: null,
    pilotRole: undefined,
    loading: false,
    geoLoading: false,
    error: null,
    aiConsentChoice: "later",
  };
}

function buildLocalPreviewState(): RegisterFormState {
  return {
    ...buildInitialFormState(),
    email: "test.person@example.invalid",
    displayName: "Test Person",
    firstName: "Test",
    lastName: "Person",
    dateOfBirth: "1948-01-01",
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
  };
}

function getLocalPreviewStep(searchParams: Pick<URLSearchParams, "get">): Step | null {
  if (process.env.NODE_ENV === "production") return null;

  const previewStep =
    searchParams.get("previewStep") ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("previewStep")
      : null);
  if (LOCAL_PREVIEW_STEPS.includes(previewStep as Step)) {
    return previewStep as Step;
  }

  return null;
}

// Wrapper mit Suspense-Boundary fuer useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Laden...</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  // === State ===
  const [step, setStep] = useState<Step>("entry");
  const [formState, setFormState] = useState<RegisterFormState>(() => buildInitialFormState());

  const searchParams = useSearchParams();

  // === URL-Parameter: Invite-Code und Referrer aus QR-Code/Link ===
  /* eslint-disable react-hooks/set-state-in-effect -- URL-Params einmalig in State uebernehmen */
  useEffect(() => {
    const previewStep = getLocalPreviewStep(searchParams);
    if (previewStep) {
      setFormState(buildLocalPreviewState());
      setStep(previewStep);
      return;
    }

    const invite = searchParams.get("invite");
    const ref = searchParams.get("ref");
    if (invite) {
      setFormState((prev) => ({
        ...prev,
        inviteCode: normalizeCode(invite),
        verificationMethod: "invite_code",
      }));
      setStep("invite_code"); // Direkt zum Code-Schritt
    }
    if (ref) {
      setFormState((prev) => ({
        ...prev,
        referrerId: ref,
        verificationMethod: "neighbor_invite",
      }));
    }
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // === Partielle State-Updates (wie setState bei Klassen-Komponenten) ===
  const updateState = useCallback(
    (updater: Partial<RegisterFormState> | ((prev: RegisterFormState) => Partial<RegisterFormState>)) => {
      setFormState((prev) => {
        const partial = typeof updater === "function" ? updater(prev) : updater;
        return { ...prev, ...partial };
      });
    },
    []
  );

  // === Fortschrittsberechnung ===
  const totalSteps = 4;
  const currentStep = (() => {
    if (step === "entry" || step === "invite_code" || step === "address") return 1;
    if (step === "identity") return 2;
    if (step === "pilot_role") return 3;
    if (step === "ai_consent") return 4;
    return 4; // magic_link_sent
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
          {step === "magic_link_sent"
            ? "Code eingeben"
            : "Gute Nachbarschaft beginnt mit einem kleinen Schritt"}
        </CardTitle>
        {step !== "magic_link_sent" && (
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Ein geschlossener Pilot für Bad Säckingen, damit Hilfe, Familie und
            Quartier leichter zusammenfinden.
          </p>
        )}

        {/* Fortschrittsbalken (nicht auf Bestaetigungsseite) */}
        {step !== "magic_link_sent" && (
          <>
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
            {process.env.NODE_ENV !== "production" && (
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
            )}
          </>
        )}
      </CardHeader>
      <CardContent>
        {/* Schritt 1a: Einstieg — Zwei Pfade */}
        {step === "entry" && (
          <RegisterStepEntry state={formState} setState={updateState} setStep={setStep} />
        )}

        {/* Schritt 1b: Invite-Code eingeben */}
        {step === "invite_code" && (
          <RegisterStepInvite state={formState} setState={updateState} setStep={setStep} />
        )}

        {/* Schritt 1c: Adresse / Standort */}
        {step === "address" && (
          <RegisterStepAddress state={formState} setState={updateState} setStep={setStep} />
        )}

        {/* Schritt 2: Name + E-Mail → Magic Link */}
        {step === "identity" && (
          <RegisterStepIdentity state={formState} setState={updateState} setStep={setStep} />
        )}

        {/* Schritt 3: Pilot-Rolle */}
        {step === "pilot_role" && (
          <RegisterStepPilotRole state={formState} setState={updateState} setStep={setStep} />
        )}

        {/* Schritt 4: KI-Einwilligung */}
        {step === "ai_consent" && (
          <RegisterStepAiConsent state={formState} setState={updateState} setStep={setStep} />
        )}

        {/* Bestaetigung: OTP-Code Eingabe */}
        {step === "magic_link_sent" && (
          <OtpCodeEntry
            email={formState.email}
            redirectTo="/welcome"
            onBack={() => { setStep("ai_consent"); updateState({ error: null }); }}
            onResend={() => {
              const supabase = createClient();
              supabase.auth.signInWithOtp({
                email: formState.email,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome` },
              });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
