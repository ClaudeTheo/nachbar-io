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
  const [formState, setFormState] = useState<RegisterFormState>({
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
  });

  const searchParams = useSearchParams();

  // === URL-Parameter: Invite-Code und Referrer aus QR-Code/Link ===
  /* eslint-disable react-hooks/set-state-in-effect -- URL-Params einmalig in State uebernehmen */
  useEffect(() => {
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
