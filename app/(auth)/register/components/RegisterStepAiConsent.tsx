import { useState } from "react";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode } from "@/lib/invite-codes";
import type { StepProps } from "./types";

type AiConsentChoice = "yes" | "no" | "later";

function buildFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function RegisterStepAiConsent({ state, setState, setStep }: StepProps) {
  const [choice, setChoice] = useState<AiConsentChoice>(
    state.aiConsentChoice ?? "later",
  );

  async function complete(choiceToSave: AiConsentChoice) {
    setChoice(choiceToSave);
    setState({ aiConsentChoice: choiceToSave, loading: true, error: null });

    try {
      const displayName = buildFullName(state.firstName, state.lastName);
      const completeRes = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email,
          displayName,
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          dateOfBirth: state.dateOfBirth.trim(),
          pilotRole: state.pilotRole,
          aiConsentChoice: choiceToSave,
          uiMode: "active",
          householdId: state.householdId,
          streetName: state.selectedAddress?.street || undefined,
          houseNumber: state.houseNumber.trim() || undefined,
          lat: state.selectedAddress?.lat || undefined,
          lng: state.selectedAddress?.lng || undefined,
          postalCode:
            state.postalCode.trim() ||
            state.selectedAddress?.postalCode ||
            undefined,
          city: state.city.trim() || state.selectedAddress?.city || undefined,
          verificationMethod: state.verificationMethod,
          inviteCode: state.inviteCode
            ? normalizeCode(state.inviteCode)
            : undefined,
          referrerId: state.referrerId,
          quarterId: state.geoQuarter?.quarter_id || undefined,
          website: state.website || "",
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        setState({
          error: completeData.error || "Registrierung fehlgeschlagen.",
          loading: false,
        });
        return;
      }

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: state.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/welcome`,
        },
      });

      if (otpError) {
        setState({
          error: otpError.message?.includes("rate limit")
            ? "Zu viele Versuche. Bitte warten Sie einen Moment."
            : "Magic Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
          loading: false,
        });
        return;
      }

      if (state.verificationMethod === "neighbor_invite" && state.referrerId) {
        fetch("/api/reputation/recompute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: state.referrerId }),
        }).catch(() => {});
      }

      setState({ loading: false });
      setStep("magic_link_sent");
    } catch (err) {
      console.error("Registrierung Netzwerkfehler:", err);
      setState({
        error: "Netzwerkfehler. Bitte pruefen Sie Ihre Internetverbindung.",
        loading: false,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-quartier-green/25 bg-quartier-green/5 p-4">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-quartier-green" />
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-anthrazit">
              KI-Hilfe verwenden?
            </h2>
            <p className="text-sm text-muted-foreground">
              KI-Hilfe ist standardmaessig ausgeschaltet. Sie koennen Vorlesen,
              Sprachbefehle und den Assistenten jetzt erlauben, ablehnen oder
              spaeter in den Einstellungen entscheiden.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-900">
            Personenbezogene KI-Nutzung startet erst, wenn Anbieterfreigabe,
            AVV, Pseudonymisierung und Ihre Einwilligung zusammen vorliegen.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <Button
          type="button"
          disabled={state.loading}
          onClick={() => complete("yes")}
          className="w-full bg-quartier-green hover:bg-quartier-green-dark"
        >
          Ja, aktivieren
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={state.loading}
          onClick={() => complete("no")}
          className="w-full"
        >
          Nein
        </Button>
        <Button
          type="button"
          variant={choice === "later" ? "secondary" : "outline"}
          disabled={state.loading}
          onClick={() => complete("later")}
          className="w-full"
        >
          Spaeter entscheiden
        </Button>
      </div>

      {state.error && <p className="text-sm text-emergency-red">{state.error}</p>}

      <button
        type="button"
        onClick={() => {
          setState({ error: null });
          setStep("identity");
        }}
        className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Zurueck
      </button>
    </div>
  );
}
