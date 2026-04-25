"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode } from "@/lib/invite-codes";
import { OtpCodeEntry } from "@/components/auth/OtpCodeEntry";
import {
  RegisterStepEntry,
  RegisterStepInvite,
  RegisterStepAddress,
  RegisterStepIdentity,
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
    loading: false,
    geoLoading: false,
    error: null,
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
  const totalSteps = 2;
  const currentStep = (() => {
    if (step === "entry" || step === "invite_code" || step === "address") return 1;
    if (step === "identity") return 2;
    return 2; // magic_link_sent
  })();

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center">
        <div className="mb-2 text-4xl">🏘️</div>
        <CardTitle className="text-2xl text-anthrazit">
          {step === "magic_link_sent" ? "Code eingeben" : "Willkommen bei QuartierApp"}
        </CardTitle>

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

        {/* Bestaetigung: OTP-Code Eingabe */}
        {step === "magic_link_sent" && (
          <OtpCodeEntry
            email={formState.email}
            redirectTo="/welcome"
            onBack={() => { setStep("identity"); updateState({ error: null }); }}
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
