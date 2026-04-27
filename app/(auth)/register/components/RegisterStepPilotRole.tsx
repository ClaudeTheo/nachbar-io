import { ArrowLeft, HeartHandshake, Handshake, TestTube2, UserRound } from "lucide-react";
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
  function chooseRole(pilotRole: PilotRole) {
    setState({ pilotRole, error: null });
    setStep("ai_consent");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold text-anthrazit">
          Wie nutzen Sie Nachbar.io im Pilot?
        </h2>
        <p className="text-sm text-muted-foreground">
          So koennen wir die App einfacher und passender vorbereiten.
        </p>
      </div>

      <div className="grid gap-3">
        {ROLE_OPTIONS.map(({ role, label, description, icon: Icon }) => (
          <button
            key={role}
            type="button"
            onClick={() => chooseRole(role)}
            className="w-full rounded-lg border-2 border-border p-4 text-left transition-colors hover:border-quartier-green/50"
            aria-pressed={state.pilotRole === role}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
                <Icon className="h-5 w-5 text-quartier-green" />
              </div>
              <div>
                <p className="font-semibold text-anthrazit">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </button>
        ))}
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
