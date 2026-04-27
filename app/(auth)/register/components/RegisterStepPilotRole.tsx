"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Heart, HeartHandshake, Handshake, Info, TestTube2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PilotRole, StepProps } from "./types";

const ROLE_OPTIONS: Array<{
  role: PilotRole;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    role: "resident",
    label: "Ich nutze die App fuer mich",
    description: "Einfache Ansicht und passende Hinweise fuer den Alltag.",
    icon: UserRound,
  },
  {
    role: "caregiver",
    label: "Ich unterstuetze jemanden",
    description: "Fuer Angehoerige oder Begleiter, die mithelfen.",
    icon: HeartHandshake,
  },
  {
    role: "helper",
    label: "Ich helfe im Quartier",
    description: "Fuer Nachbarn, Projektteam oder Quartiershilfe im Pilot.",
    icon: Handshake,
  },
  {
    role: "test_user",
    label: "Ich teste nur",
    description: "Wird als Testkonto markiert und vor echtem Pilot bereinigt.",
    icon: TestTube2,
  },
];

export function RegisterStepPilotRole({ state, setState, setStep }: StepProps) {
  const [showInfo, setShowInfo] = useState(false);

  function chooseRole(pilotRole: PilotRole) {
    setState({ pilotRole, error: null });
  }

  function continueToAiConsent() {
    if (!state.pilotRole) {
      setState({ error: "Bitte wählen Sie aus, wie Sie Nachbar.io im Pilot nutzen." });
      return;
    }

    setState({ error: null });
    setStep("ai_consent");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold text-anthrazit">
          Wie nutzen Sie Nachbar.io im Pilot?
        </h2>
        <p className="text-sm text-muted-foreground">
          Nachbar.io lebt davon, dass Menschen im Quartier aufeinander achten.
          Ihre Rolle hilft uns, die App menschlicher und passender vorzubereiten.
        </p>
      </div>

      <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
        <div className="flex items-start gap-2">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-sm text-rose-900">
            Im Pilot geht es nicht um Technik um der Technik willen. Es geht um
            Vertrauen, Nähe und kleine Hilfen im Alltag.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowInfo((current) => !current)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-anthrazit transition-colors hover:border-quartier-green/50"
        aria-expanded={showInfo}
      >
        <Info className="h-4 w-4 text-quartier-green" />
        Rollen und Pilot erklären
      </button>

      {showInfo && (
        <div className="space-y-3 rounded-xl border border-border bg-white p-4 text-sm text-muted-foreground">
          <section>
            <h3 className="font-semibold text-anthrazit">Warum fragen wir nach Ihrer Rolle?</h3>
            <p className="mt-1">
              Der Pilot soll zeigen, wer die App wirklich nutzt: Menschen für
              sich selbst, Angehörige, Nachbarn oder reine Testkonten. So können
              wir die App einfacher, sicherer und hilfreicher machen.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-anthrazit">Was bedeuten die Rollen?</h3>
            <p className="mt-1">
              „Für mich“ ist für Menschen, die Nachbar.io selbst nutzen.
              „Unterstützer“ ist für Angehörige oder Begleiter. „Quartierhilfe“
              ist für Menschen, die im Pilot helfen oder organisieren.
              „Testnutzer“ ist nur zum Ausprobieren.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-anthrazit">Was passiert mit Testkonten?</h3>
            <p className="mt-1">
              Testkonten werden markiert und vor einem echten Pilot mit realen
              Familien bereinigt. So bleiben Testdaten und echte Pilotdaten
              getrennt.
            </p>
          </section>
          <section>
            <h3 className="font-semibold text-anthrazit">Was ist mit KI?</h3>
            <p className="mt-1">
              Die KI-Hilfe bleibt standardmäßig aus. Sie entscheiden im nächsten
              Schritt, ob Sie sie aktivieren, ablehnen oder später entscheiden.
            </p>
          </section>
        </div>
      )}

      <div className="grid gap-3">
        {ROLE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
          <button
            key={role}
            type="button"
            onClick={() => chooseRole(role)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              state.pilotRole === role
                ? "border-quartier-green bg-quartier-green/5"
                : "border-border hover:border-quartier-green/50"
            }`}
            aria-pressed={state.pilotRole === role}
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
              {state.pilotRole === role && (
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-quartier-green" aria-hidden="true" />
              )}
            </div>
          </button>
        ))}
      </div>

      {state.pilotRole === "test_user" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Testkonten werden markiert und vor dem echten Pilot bereinigt.
        </div>
      )}

      {state.error && <p className="text-sm text-emergency-red">{state.error}</p>}

      <Button
        type="button"
        disabled={!state.pilotRole}
        onClick={continueToAiConsent}
        className="w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        Weiter zur KI-Auswahl
      </Button>

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
