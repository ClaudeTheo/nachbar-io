"use client";

import {
  ArrowLeft,
  CheckCircle2,
  HandHeart,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { USER_MODE_CONFIG, type UserUiMode } from "@/lib/user-modes";
import type { StepProps } from "./types";

const MODE_OPTIONS: Array<{
  mode: Extract<UserUiMode, "active" | "comfort" | "senior">;
  icon: typeof LayoutDashboard;
  helper: string;
}> = [
  {
    mode: "active",
    icon: LayoutDashboard,
    helper: "Fuer Menschen, die viele Quartierfunktionen kompakt nutzen moechten.",
  },
  {
    mode: "comfort",
    icon: HandHeart,
    helper: "Fuer aktive Nachbarn ab 55: ruhiger, groesser, klarer, ohne Pflegegefuehl.",
  },
  {
    mode: "senior",
    icon: ShieldCheck,
    helper: "Fuer sehr einfache Bedienung mit grossen Kacheln und Notruf zuerst.",
  },
];

export function RegisterStepUiMode({ state, setState, setStep }: StepProps) {
  function chooseMode(uiMode: UserUiMode) {
    setState({ uiMode, error: null });
  }

  function continueToAiConsent() {
    if (!state.uiMode) {
      setState({
        error: "Bitte waehlen Sie aus, welche Oberflaeche Sie nutzen moechten.",
      });
      return;
    }

    setState({ error: null });
    setStep("ai_consent");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold text-anthrazit">
          Welche Oberflaeche passt zu Ihnen?
        </h2>
        <p className="text-sm text-muted-foreground">
          Sie koennen diese Auswahl spaeter im Profil aendern.
        </p>
      </div>

      <div className="grid gap-3">
        {MODE_OPTIONS.map(({ mode, icon: Icon, helper }) => {
          const config = USER_MODE_CONFIG[mode];
          const selected = state.uiMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => chooseMode(mode)}
              className={`min-h-[88px] w-full rounded-lg border-2 p-4 text-left transition-colors ${
                selected
                  ? "border-quartier-green bg-quartier-green/5"
                  : "border-border bg-white hover:border-quartier-green/50"
              }`}
              aria-label={`${config.label}: ${config.surface.title}`}
              aria-pressed={selected}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-quartier-green/10">
                  <Icon className="h-5 w-5 text-quartier-green" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-anthrazit">
                    {config.label}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {helper}
                  </span>
                </span>
                {selected && (
                  <CheckCircle2
                    className="mt-1 h-5 w-5 shrink-0 text-quartier-green"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("pilot_role")}
          className="min-h-12 flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurueck
        </Button>
        <Button
          type="button"
          onClick={continueToAiConsent}
          className="min-h-12 flex-1 bg-quartier-green text-white hover:bg-quartier-green/90"
        >
          Weiter
        </Button>
      </div>
    </div>
  );
}
