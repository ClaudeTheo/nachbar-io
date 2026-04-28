"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  MessageCircleQuestion,
  Mic,
  PowerOff,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode } from "@/lib/invite-codes";
import type { AiAssistanceLevel, StepProps } from "./types";
import { KiHelpFaqSheet } from "@/components/ki-help/KiHelpFaqSheet";

type LevelOption = {
  level: AiAssistanceLevel;
  label: string;
  description: string;
  icon: typeof Sparkles;
};

const LEVEL_OPTIONS: LevelOption[] = [
  {
    level: "off",
    label: "Aus",
    description: "Die KI-Hilfe bleibt ausgeschaltet.",
    icon: PowerOff,
  },
  {
    level: "basic",
    label: "Basis",
    description: "Nach Ihrer Einwilligung: erklären, vorlesen und einfache Hilfe in der App.",
    icon: BookOpen,
  },
  {
    level: "everyday",
    label: "Alltag",
    description: "Nach Ihrer Einwilligung: beim Formulieren, Verstehen und bei kleinen Fragen helfen.",
    icon: Sparkles,
  },
  {
    level: "later",
    label: "Später entscheiden",
    description: "Sie entscheiden später in den Einstellungen.",
    icon: Clock,
  },
];

function buildFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function levelToConsentChoice(
  level: AiAssistanceLevel,
): "yes" | "no" | "later" {
  if (level === "basic" || level === "everyday") return "yes";
  if (level === "off") return "no";
  return "later";
}

export function RegisterStepAiConsent({ state, setState, setStep }: StepProps) {
  const [selectedLevel, setSelectedLevel] = useState<AiAssistanceLevel | null>(
    state.aiAssistanceLevel ?? null,
  );
  const [aiConsentConfirmed, setAiConsentConfirmed] = useState(false);

  const needsExplicitAiConsent =
    selectedLevel === "basic" || selectedLevel === "everyday";
  const canSubmit =
    Boolean(selectedLevel) &&
    !state.loading &&
    (!needsExplicitAiConsent || aiConsentConfirmed);

  function chooseLevel(level: AiAssistanceLevel) {
    setSelectedLevel(level);
    setAiConsentConfirmed(false);
    setState({
      aiAssistanceLevel: level,
      aiConsentChoice: levelToConsentChoice(level),
      error: null,
    });
  }

  async function submit() {
    if (!selectedLevel) return;
    if (needsExplicitAiConsent && !aiConsentConfirmed) {
      setState({
        error:
          "Bitte bestätigen Sie die freiwillige Einwilligung zur KI-Hilfe.",
      });
      return;
    }

    const choice = levelToConsentChoice(selectedLevel);
    setState({ loading: true, error: null });

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
          aiConsentChoice: choice,
          aiAssistanceLevel: selectedLevel,
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
        error: "Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung.",
        loading: false,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold text-anthrazit">
          Möchten Sie Unterstützung durch die KI-Hilfe?
        </h2>
      </div>

      <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4">
        <div className="flex items-start gap-3">
          <KiHelpFaqSheet />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-anthrazit">
              Hallo, ich bin die KI-Hilfe der QuartierApp. Ich kann später beim
              Vorlesen, Formulieren und Verstehen helfen.
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
                Nachrichten und Hinweise vorlesen lassen
              </li>
              <li className="flex items-start gap-2">
                <Mic className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
                Antworten sprechen statt tippen
              </li>
              <li className="flex items-start gap-2">
                <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
                Kleine Fragen zur App oder zum Quartier stellen
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-quartier-green/25 bg-quartier-green/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-quartier-green" />
          <p className="text-sm text-anthrazit">
            Sie entscheiden selbst, ob und wann Sie mich nutzen möchten.
            Standardmäßig aus.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 text-sm">
        <p className="font-semibold text-anthrazit">
          Datenschutz und Einwilligung
        </p>
        <p className="mt-1 text-muted-foreground">
          Die Nutzung der KI-Hilfe ist freiwillig. Wenn Sie „Basis“ oder
          „Alltag“ wählen, erlauben Sie die Verarbeitung Ihrer Eingaben für die
          ausgewählte KI-Hilfe, sobald diese Funktion freigegeben ist.
        </p>
        <p className="mt-2 text-muted-foreground">
          Sie können diese Einwilligung jederzeit später widerrufen. Ohne Ihre
          Einwilligung bleibt die KI-Hilfe ausgeschaltet.
        </p>
        <a
          href="/datenschutz"
          className="mt-2 inline-flex text-quartier-green underline hover:no-underline"
        >
          Datenschutzerklärung ansehen
        </a>
      </div>

      <div className="grid gap-3">
        {LEVEL_OPTIONS.map(({ level, label, description, icon: Icon }) => (
          <button
            key={level}
            type="button"
            disabled={state.loading}
            onClick={() => chooseLevel(level)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              selectedLevel === level
                ? "border-quartier-green bg-quartier-green/5"
                : "border-border hover:border-quartier-green/50"
            }`}
            aria-pressed={selectedLevel === level}
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
              {selectedLevel === level && (
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
          disabled
          aria-disabled="true"
          className="w-full cursor-not-allowed rounded-lg border-2 border-dashed border-border/60 bg-muted/30 p-4 text-left opacity-70"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-anthrazit">
                Persönlich (später)
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Nur mit ausdrücklicher Einwilligung und aktiven Schutzmaßnahmen,
                kommt mit Phase 2 nach Freigabe.
              </p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Vor Ihrer Einwilligung wird nichts an eine KI gesendet. Persönliche
        KI-Funktionen starten erst, wenn die nötigen Schutzmaßnahmen aktiv sind.
        Ihre Eingaben sind nicht öffentlich.
      </p>

      {needsExplicitAiConsent && (
        <label className="flex gap-3 rounded-xl border border-quartier-green/25 bg-quartier-green/5 p-3 text-sm text-anthrazit">
          <input
            type="checkbox"
            checked={aiConsentConfirmed}
            onChange={(event) => {
              setAiConsentConfirmed(event.target.checked);
              setState({ error: null });
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-quartier-green"
          />
          <span>
            Ich willige freiwillig ein, dass die QuartierApp meine Eingaben für
            die ausgewählte KI-Hilfe verarbeitet. Ich kann diese Einwilligung
            später widerrufen.
          </span>
        </label>
      )}

      {state.error && (
        <p className="text-sm text-emergency-red">{state.error}</p>
      )}

      <Button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className="w-full bg-quartier-green hover:bg-quartier-green-dark"
      >
        Auswahl speichern und Link senden
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
        Zurück
      </button>
    </div>
  );
}
