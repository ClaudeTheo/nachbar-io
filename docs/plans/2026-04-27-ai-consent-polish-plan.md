# KI-Consent-Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `RegisterStepAiConsent.tsx` auf das Polish-Niveau der polished
Geschwister-Schritte (`RegisterStepEntry`, `RegisterStepPilotRole`)
heben. Vier wählbare KI-Stufen-Cards (Aus/Basis/Alltag/Später) plus eine
disabled „Persönlich"-Card als Phase-2-Ausblick. Pulsierender KI-Hilfe-
Punkt als Vertrauens-Visual. Backend speichert zusätzlich
`users.settings.ai_assistance_level` ohne bestehende `aiConsentChoice`-
Logik zu brechen. Sieben sichtbare Onboarding-Texte werden konsistent
auf „die QuartierApp" gesetzt.

**Architecture:** Bestehende Infrastruktur (Reality-Check 2026-04-26)
weiterverwenden: `users.settings.ai_enabled` bleibt Hauptschalter,
`care_consents.ai_onboarding` bleibt formaler Consent. Neuer Settings-
Schlüssel `ai_assistance_level` wird ergänzend in JSONB geschrieben —
keine SQL-Migration. UI-Komponente wird neu strukturiert nach Card-
Pattern aus `RegisterStepPilotRole.tsx`. KiHelpPulseDot ist reine CSS-
Animation, kein KI-Call vor Consent.

**Tech Stack:** Next.js 16 App Router · React Testing Library + Vitest ·
Tailwind v4 · Lucide-React Icons · Supabase JSONB Settings · TDD strict.

**Reference:** Design-Doc `docs/plans/2026-04-27-ai-consent-polish-design.md`
(Commit `cf06df1`).

---

## Pre-Conditions

- Branch: `master`. Working dir clean (außer den heutigen lokalen
  Commits 0..n+1). Keine offenen Konflikte.
- Lokaler Supabase-Stack ist NICHT erforderlich (Tests sind Unit-Tests
  mit Mocks; manueller Smoke nutzt Cloud-Modus).
- Pre-Check für `ai_assistance_level` lieferte 0 Treffer (Design-Doc
  bestätigt). Pflicht-Reihenfolge `pre-check → TDD` ist erfüllt.

---

## Task 1: Type-Erweiterung in `types.ts`

**Files:**
- Modify: `app/(auth)/register/components/types.ts:33-34`

**Step 1: Write the failing type-level test**

Add new file: `__tests__/app/register-types.test.ts`

```ts
import { expectTypeOf, describe, it } from "vitest";
import type {
  AiAssistanceLevel,
  RegisterFormState,
} from "@/app/(auth)/register/components/types";

describe("RegisterFormState types", () => {
  it("AiAssistanceLevel covers off/basic/everyday/later", () => {
    expectTypeOf<AiAssistanceLevel>().toEqualTypeOf<
      "off" | "basic" | "everyday" | "later"
    >();
  });

  it("RegisterFormState exposes optional aiAssistanceLevel", () => {
    expectTypeOf<RegisterFormState["aiAssistanceLevel"]>().toEqualTypeOf<
      AiAssistanceLevel | undefined
    >();
  });
});
```

**Step 2: Run to verify FAIL**

Run:
```bash
git -C "$REPO" diff --quiet || echo "wd dirty"
cd "$REPO" && npx vitest run __tests__/app/register-types.test.ts
```
Expected: FAIL with `Cannot find module ... AiAssistanceLevel` or
`Property 'aiAssistanceLevel' does not exist on type ...`.

**Step 3: Write minimal implementation**

Edit `app/(auth)/register/components/types.ts` — add type alias and
field:

```ts
// In types.ts, ergänzen direkt unter PilotRole:
export type AiAssistanceLevel = "off" | "basic" | "everyday" | "later";

// In Interface RegisterFormState, neben aiConsentChoice:
aiAssistanceLevel?: AiAssistanceLevel;
```

**Step 4: Run to verify PASS**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-types.test.ts
cd "$REPO" && npx tsc --noEmit
```
Expected: PASS, tsc: 0 errors.

**Step 5: Commit**

```bash
git -C "$REPO" add app/\(auth\)/register/components/types.ts \
  __tests__/app/register-types.test.ts
git -C "$REPO" commit -m "feat(register): add AiAssistanceLevel type + state field"
```

---

## Task 2: Neue Sub-Komponente `KiHelpPulseDot`

**Files:**
- Create: `app/(auth)/register/components/KiHelpPulseDot.tsx`
- Create: `__tests__/app/register-ki-help-pulse-dot.test.tsx`

**Step 1: Write the failing test**

```tsx
// __tests__/app/register-ki-help-pulse-dot.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KiHelpPulseDot } from "@/app/(auth)/register/components/KiHelpPulseDot";

describe("KiHelpPulseDot", () => {
  afterEach(() => cleanup());

  it("rendert ein dekoratives Element ohne semantische Bedeutung", () => {
    render(<KiHelpPulseDot data-testid="dot" />);
    const node = screen.getByTestId("dot");
    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute("aria-hidden", "true");
  });

  it("traegt eine motion-aware Klasse fuer prefers-reduced-motion", () => {
    render(<KiHelpPulseDot data-testid="dot" />);
    const node = screen.getByTestId("dot");
    expect(node.className).toMatch(/motion-safe/);
  });

  it("hat einen quartier-green Innenkreis", () => {
    const { container } = render(<KiHelpPulseDot />);
    const inner = container.querySelector("[data-pulse-inner]");
    expect(inner).not.toBeNull();
    expect(inner?.className).toMatch(/bg-quartier-green/);
  });
});
```

**Step 2: Run to verify FAIL**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-ki-help-pulse-dot.test.tsx
```
Expected: FAIL — `Cannot find module '@/app/(auth)/register/components/KiHelpPulseDot'`.

**Step 3: Write minimal implementation**

```tsx
// app/(auth)/register/components/KiHelpPulseDot.tsx
// Dekorativer KI-Hilfe-Punkt fuer den Consent-Screen.
// Kein KI-Call. CSS-only Pulse mit prefers-reduced-motion-Schutz.
import type { HTMLAttributes } from "react";

export function KiHelpPulseDot(
  props: HTMLAttributes<HTMLSpanElement>,
) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center"
      {...props}
    >
      <span
        data-pulse-outer
        className="motion-safe:animate-[ki-help-pulse_2.4s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-quartier-green/25"
      />
      <span
        data-pulse-inner
        className="relative inline-flex h-2.5 w-2.5 rounded-full bg-quartier-green"
      />
    </span>
  );
}
```

Tailwind v4 nutzt `motion-safe:` Variante automatisch (deaktiviert bei
`prefers-reduced-motion: reduce`). Die `@keyframes ki-help-pulse` werden
in der globalen CSS-Datei ergänzt:

Edit `app/globals.css` (oder die zentrale Tailwind-Layer-Datei) — am
Ende anhängen:

```css
@keyframes ki-help-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%      { transform: scale(1.18); opacity: 1; }
}
```

> **Pre-Check vor diesem Sub-Schritt:** `grep -n "@keyframes" app/globals.css`
> ausführen. Wenn andere Animationen-Names existieren, sicherstellen dass
> `ki-help-pulse` nicht schon vergeben ist. Falls Datei nicht
> `app/globals.css` heißt: `find app -maxdepth 2 -name "globals*.css"`.

**Step 4: Run to verify PASS**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-ki-help-pulse-dot.test.tsx
cd "$REPO" && npx eslint app/\(auth\)/register/components/KiHelpPulseDot.tsx
```
Expected: PASS, eslint: clean.

**Step 5: Commit**

```bash
git -C "$REPO" add \
  app/\(auth\)/register/components/KiHelpPulseDot.tsx \
  app/globals.css \
  __tests__/app/register-ki-help-pulse-dot.test.tsx
git -C "$REPO" commit -m "feat(register): add KiHelpPulseDot decorative pulse component"
```

---

## Task 3: AiConsent — RED-Tests für neuen Polish-Layout

**Files:**
- Modify: `__tests__/app/register-ai-consent.test.tsx` (komplett neu
  aufgebohrt; bestehender 1-Test wird ersetzt)

**Step 1: Write failing tests**

```tsx
// __tests__/app/register-ai-consent.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterStepAiConsent } from "@/app/(auth)/register/components/RegisterStepAiConsent";
import type {
  RegisterFormState,
  Step,
} from "@/app/(auth)/register/components/types";

function buildState(): RegisterFormState {
  return {
    email: "max@example.com",
    displayName: "",
    firstName: "Max",
    lastName: "Mustermann",
    dateOfBirth: "1977-04-25",
    inviteCode: "",
    householdId: "hh-1",
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
  };
}

function StatefulAiConsent({
  initialState = buildState(),
  onStep = vi.fn(),
}: {
  initialState?: RegisterFormState;
  onStep?: (step: Step) => void;
}) {
  const [state, setLocalState] = useState(initialState);
  return (
    <RegisterStepAiConsent
      state={state}
      setState={(updates) =>
        setLocalState((current) => ({
          ...current,
          ...(typeof updates === "function" ? updates(current) : updates),
        }))
      }
      setStep={onStep}
    />
  );
}

describe("RegisterStepAiConsent — Polish 2026-04-27", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;
  });

  it("zeigt Title, Hero-Begruessung der QuartierApp und Kontroll-Botschaft", () => {
    render(<StatefulAiConsent />);
    expect(
      screen.getByText("Möchten Sie Unterstützung durch die KI-Hilfe?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hallo, ich bin die KI-Hilfe der QuartierApp/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sie entscheiden selbst, ob und wann Sie mich nutzen/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Standardmäßig aus/i),
    ).toBeInTheDocument();
  });

  it("zeigt 4 wahlbare Stufen-Cards plus eine disabled Persoenlich-Card", () => {
    render(<StatefulAiConsent />);
    expect(screen.getByRole("button", { name: /^Aus/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Basis/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Alltag/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Später entscheiden/i }),
    ).toBeEnabled();
    const personal = screen.getByRole("button", { name: /Persönlich/i });
    expect(personal).toBeDisabled();
    expect(personal).toHaveAttribute("aria-disabled", "true");
  });

  it("markiert Auswahl visuell und submitted nicht automatisch", async () => {
    const user = userEvent.setup();
    const setStep = vi.fn();
    render(<StatefulAiConsent onStep={setStep} />);
    await user.click(screen.getByRole("button", { name: /^Basis/i }));

    expect(
      screen.getByRole("button", { name: /^Basis/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(setStep).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("Submit-Button ist disabled bis eine Auswahl getroffen wurde", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);
    const submit = screen.getByRole("button", {
      name: /Auswahl speichern und Link senden/i,
    });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^Alltag/i }));
    expect(submit).toBeEnabled();
  });

  it("Klick auf disabled Persoenlich-Card aendert State nicht", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);
    const submit = screen.getByRole("button", {
      name: /Auswahl speichern und Link senden/i,
    });
    await user.click(screen.getByRole("button", { name: /Persönlich/i }));
    expect(submit).toBeDisabled();
  });

  it.each([
    ["Aus", "no", "off"],
    ["Basis", "yes", "basic"],
    ["Alltag", "yes", "everyday"],
    ["Später entscheiden", "later", "later"],
  ] as const)(
    "Submit mit %s sendet aiConsentChoice=%s und aiAssistanceLevel=%s",
    async (label, expectedChoice, expectedLevel) => {
      const user = userEvent.setup();
      render(<StatefulAiConsent />);

      await user.click(screen.getByRole("button", { name: new RegExp(`^${label}`, "i") }));
      await user.click(
        screen.getByRole("button", {
          name: /Auswahl speichern und Link senden/i,
        }),
      );

      const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
      const completeCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes("/api/register/complete"),
      );
      expect(completeCall).toBeDefined();
      const body = JSON.parse(String(completeCall![1].body));
      expect(body.aiConsentChoice).toBe(expectedChoice);
      expect(body.aiAssistanceLevel).toBe(expectedLevel);
    },
  );
});
```

**Step 2: Run to verify FAIL**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-ai-consent.test.tsx
```
Expected: FAIL — Title nicht gefunden, Cards nicht wie erwartet,
Submit-Button-Name fehlt, Mapping-Tests laufen nicht.

**Step 3: Commit RED state**

```bash
git -C "$REPO" add __tests__/app/register-ai-consent.test.tsx
git -C "$REPO" commit -m "test(register): RED tests for AiConsent polish + level mapping"
```

---

## Task 4: AiConsent — GREEN Implementation des Polish

**Files:**
- Modify: `app/(auth)/register/components/RegisterStepAiConsent.tsx`
  (komplette Restrukturierung)

**Step 1: Write minimal implementation**

Ersetze den kompletten Inhalt der Datei durch:

```tsx
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
import type {
  AiAssistanceLevel,
  RegisterFormState,
  StepProps,
} from "./types";
import { KiHelpPulseDot } from "./KiHelpPulseDot";

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
    description: "Erklären, Vorlesen und einfache Hilfe in der App.",
    icon: BookOpen,
  },
  {
    level: "everyday",
    label: "Alltag",
    description: "Beim Formulieren, Verstehen und kleinen Fragen unterstützen.",
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

export function RegisterStepAiConsent({
  state,
  setState,
  setStep,
}: StepProps) {
  const [selectedLevel, setSelectedLevel] = useState<AiAssistanceLevel | null>(
    state.aiAssistanceLevel ?? null,
  );

  function chooseLevel(level: AiAssistanceLevel) {
    setSelectedLevel(level);
    setState({
      aiAssistanceLevel: level,
      aiConsentChoice: levelToConsentChoice(level),
      error: null,
    });
  }

  async function submit() {
    if (!selectedLevel) return;
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
          city:
            state.city.trim() || state.selectedAddress?.city || undefined,
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

      if (
        state.verificationMethod === "neighbor_invite" &&
        state.referrerId
      ) {
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
          <KiHelpPulseDot />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-anthrazit">
              Hallo, ich bin die KI-Hilfe der QuartierApp. Ich kann später
              beim Vorlesen, Formulieren und Verstehen helfen.
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
                Nur mit ausdrücklicher Einwilligung und aktiven
                Schutzmaßnahmen, kommt mit Phase 2 nach Freigabe.
              </p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Bei Aktivierung: pseudonymisiert, AVV beim Anbieter, Nutzung
        jederzeit widerrufbar.
      </p>

      {state.error && (
        <p className="text-sm text-emergency-red">{state.error}</p>
      )}

      <Button
        type="button"
        disabled={!selectedLevel || state.loading}
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
```

> **Helper for buildFullName / levelToConsentChoice:** beide bleiben in
> dieser Datei. Wenn `levelToConsentChoice` später auch im Service
> gebraucht wird (Task 5), in `lib/services/registration.service.ts`
> dupliziert oder als shared Helper extrahiert werden — Entscheidung in
> Task 5.

> **Step-Type:** `state.aiAssistanceLevel` und `setStep` brauchen
> eventuell den State-Erweiterung-Flow aus Task 1. Dort sicherstellen
> dass `RegisterFormState` das Feld enthält.

**Step 2: Run to verify PASS**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-ai-consent.test.tsx
cd "$REPO" && npx tsc --noEmit
cd "$REPO" && npx eslint app/\(auth\)/register/components/RegisterStepAiConsent.tsx
```
Expected: alle Tests aus Task 3 PASS, tsc clean, eslint clean.

**Step 3: Commit**

```bash
git -C "$REPO" add app/\(auth\)/register/components/RegisterStepAiConsent.tsx
git -C "$REPO" commit -m "feat(register): polish AiConsent screen with 4-level cards + KiHelpPulseDot"
```

---

## Task 5: Backend — `registration.service.ts` schreibt `ai_assistance_level`

**Files:**
- Modify: `lib/services/registration.service.ts:489-540` (Funktion
  `persistUserProfile` und `RegistrationCompleteInput`-Typ)
- Create: `__tests__/lib/registration-service-ai-level.test.ts`

**Step 0: Pre-Read der Funktions-Signatur**

```bash
cd "$REPO" && grep -n "function persistUserProfile\|aiConsentChoice\|RegistrationComplete" lib/services/registration.service.ts | head -20
```

**Step 1: Write the failing test**

```ts
// __tests__/lib/registration-service-ai-level.test.ts
import { describe, it, expect, vi } from "vitest";
import { persistUserProfile } from "@/lib/services/registration.service";

function makeAdminDb() {
  const upsertMock = vi.fn().mockResolvedValue({ error: null });
  return {
    upsertMock,
    db: {
      from: vi.fn(() => ({
        upsert: upsertMock,
      })),
    } as never,
  };
}

const baseIdentity = {
  firstName: "Max",
  lastName: "Mustermann",
  dateOfBirth: "1977-04-25",
  displayName: "Max Mustermann",
};

describe("persistUserProfile — ai_assistance_level", () => {
  it.each([
    [undefined, "yes", "basic"],
    [undefined, "no", "off"],
    [undefined, "later", "later"],
    ["off", "no", "off"],
    ["basic", "yes", "basic"],
    ["everyday", "yes", "everyday"],
    ["later", "later", "later"],
  ] as const)(
    "schreibt fuer level=%s + choice=%s den ai_assistance_level=%s",
    async (level, choice, expectedLevel) => {
      const { db, upsertMock } = makeAdminDb();
      await persistUserProfile(
        db,
        "user-1",
        baseIdentity,
        "active",
        "invite_code",
        "resident",
        choice as "yes" | "no" | "later",
        level as
          | "off"
          | "basic"
          | "everyday"
          | "later"
          | undefined,
      );
      expect(upsertMock).toHaveBeenCalled();
      const written = upsertMock.mock.calls[0][0];
      expect(written.settings.ai_assistance_level).toBe(expectedLevel);
      expect(written.settings.ai_audit_log[0].assistance_level).toBe(
        expectedLevel,
      );
    },
  );
});
```

**Step 2: Run to verify FAIL**

```bash
cd "$REPO" && npx vitest run __tests__/lib/registration-service-ai-level.test.ts
```
Expected: FAIL — `persistUserProfile` Argumente passen nicht (zusätzliches
`aiAssistanceLevel`-Argument), oder `ai_assistance_level` nicht
geschrieben.

**Step 3: Implementation**

In `lib/services/registration.service.ts`:

1. Type-Erweiterung der Signatur von `persistUserProfile`:

```ts
export type AiAssistanceLevel = "off" | "basic" | "everyday" | "later";

async function persistUserProfile(
  adminDb: SupabaseClient,
  userId: string,
  pilotIdentity: PilotIdentity,
  uiMode?: string,
  verificationMethod?: string,
  pilotRoleInput?: PilotRole,
  aiConsentChoice?: "yes" | "no" | "later",
  aiAssistanceLevelInput?: AiAssistanceLevel,
): Promise<void> {
```

2. Helper im selben Modul:

```ts
const VALID_LEVELS: AiAssistanceLevel[] = ["off", "basic", "everyday", "later"];

function deriveAssistanceLevel(
  input: AiAssistanceLevel | undefined,
  choice: "yes" | "no" | "later" | undefined,
): AiAssistanceLevel {
  if (input && VALID_LEVELS.includes(input)) return input;
  if (choice === "yes") return "basic";
  if (choice === "no") return "off";
  return "later";
}
```

3. Mapping-Erweiterung im `settings`-Block (ersetze die Zeilen 514–524):

```ts
const aiEnabled = aiConsentChoice === "yes";
const assistanceLevel = deriveAssistanceLevel(
  aiAssistanceLevelInput,
  aiConsentChoice,
);
const pilotRole = normalizePilotRole(pilotRoleInput);
const settings: Record<string, unknown> = {
  ai_enabled: aiEnabled,
  ai_assistance_level: assistanceLevel,
  ai_audit_log: [
    {
      at: new Date().toISOString(),
      enabled: aiEnabled,
      assistance_level: assistanceLevel,
      source: "registration",
    },
  ],
  pilot_approval_status: requiresPilotApproval ? "pending" : "approved",
  pilot_role: pilotRole,
  pilot_identity: { /* unverändert */ },
};
```

4. `persistUserProfile` ist heute `function` ohne `export`. Damit der
   Test direkt importieren kann, ist `export` voranzustellen.

5. Die Aufrufstelle der `persistUserProfile`-Funktion (in
   `lib/services/registration.service.ts` selbst, vermutlich in
   `completeRegistration`) muss den neuen Parameter durchreichen. Such-
   und Update-Pattern:

```bash
cd "$REPO" && grep -n "persistUserProfile(" lib/services/registration.service.ts
```

Den existierenden Aufruf um `body.aiAssistanceLevel` ergänzen.

**Step 4: Run to verify PASS**

```bash
cd "$REPO" && npx vitest run __tests__/lib/registration-service-ai-level.test.ts
cd "$REPO" && npx tsc --noEmit
```
Expected: alle 7 parametrized Tests PASS, tsc clean.

**Step 5: Commit**

```bash
git -C "$REPO" add lib/services/registration.service.ts \
  __tests__/lib/registration-service-ai-level.test.ts
git -C "$REPO" commit -m "feat(register): persist ai_assistance_level + audit log entry"
```

---

## Task 6: API — `/api/register/complete` Whitelist-Validation

**Files:**
- Modify: `app/api/register/complete/route.ts` (Body-Parsing-Block)
- Modify: `__tests__/api/register-complete-bugfix.test.ts` (Erweiterung
  um Validation-Test)

**Step 0: Pre-Read**

```bash
cd "$REPO" && grep -n "aiConsentChoice\|aiAssistanceLevel" app/api/register/complete/route.ts
cd "$REPO" && head -120 app/api/register/complete/route.ts
```

**Step 1: Write the failing test**

In `__tests__/api/register-complete-bugfix.test.ts` zusätzlichen
`describe`-Block am Ende anhängen:

```ts
describe("aiAssistanceLevel — Whitelist-Validation", () => {
  it("akzeptiert basic/everyday/later/off", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "lv-user" } },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      ...chainBuilder(),
    }));
    const { POST } = await import("@/app/api/register/complete/route");
    const res = await POST(
      makeRequest({
        ...baseBody,
        householdId: "hh-base",
        aiConsentChoice: "yes",
        aiAssistanceLevel: "basic",
      }),
    );
    expect(res.status).not.toBe(400);
  });

  it("lehnt unbekannte aiAssistanceLevel-Werte mit 400 ab", async () => {
    const { POST } = await import("@/app/api/register/complete/route");
    const res = await POST(
      makeRequest({
        ...baseBody,
        aiConsentChoice: "yes",
        aiAssistanceLevel: "personal", // nicht erlaubt in dieser Phase
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/aiAssistanceLevel|ungueltig|invalid/i);
  });
});
```

**Step 2: Run to verify FAIL**

```bash
cd "$REPO" && npx vitest run __tests__/api/register-complete-bugfix.test.ts -t "Whitelist"
```
Expected: FAIL — Route validiert `aiAssistanceLevel` noch nicht.

**Step 3: Implementation**

In `app/api/register/complete/route.ts` im Body-Parsing-Block (vor dem
Aufruf von `completeRegistration` / `persistUserProfile`):

```ts
const VALID_AI_LEVELS = new Set(["off", "basic", "everyday", "later"]);

const aiAssistanceLevelRaw = body.aiAssistanceLevel;
if (
  aiAssistanceLevelRaw !== undefined &&
  aiAssistanceLevelRaw !== null &&
  !VALID_AI_LEVELS.has(String(aiAssistanceLevelRaw))
) {
  return NextResponse.json(
    {
      error:
        "aiAssistanceLevel ungueltig. Erlaubt: off, basic, everyday, later.",
    },
    { status: 400 },
  );
}
const aiAssistanceLevel = aiAssistanceLevelRaw as
  | "off"
  | "basic"
  | "everyday"
  | "later"
  | undefined;
```

Diesen Wert dann in den Service-Aufruf durchreichen (an
`completeRegistration` oder direkt `persistUserProfile`, je nach
existierender Struktur — Pre-Read in Step 0 zeigt das).

**Step 4: Run to verify PASS**

```bash
cd "$REPO" && npx vitest run __tests__/api/register-complete-bugfix.test.ts
cd "$REPO" && npx tsc --noEmit
cd "$REPO" && npx eslint app/api/register/complete/route.ts
```
Expected: alle Tests PASS, tsc clean, eslint clean.

**Step 5: Commit**

```bash
git -C "$REPO" add app/api/register/complete/route.ts \
  __tests__/api/register-complete-bugfix.test.ts
git -C "$REPO" commit -m "feat(api): validate aiAssistanceLevel against whitelist"
```

---

## Task 7: Brand-Rename — 7 Onboarding-Texte auf „die QuartierApp"

**Files:**
- Modify: `app/(auth)/register/page.tsx:108`
- Modify: `app/(auth)/register/components/RegisterStepEntry.tsx:26,63`
- Modify: `app/(auth)/register/components/RegisterStepPilotRole.tsx:49,61,64,102`
- Modify: `__tests__/app/register-pilot-role.test.tsx` (H2-Text-Erwartung)
- Modify: `__tests__/app/register-entry.test.tsx` (Brand-Erwartungen, falls
  vorhanden)

**Step 0: Pre-Read der existierenden Test-Erwartungen**

```bash
cd "$REPO" && grep -n "Nachbar\.io" __tests__/app/register-pilot-role.test.tsx __tests__/app/register-entry.test.tsx 2>/dev/null
```

**Step 1: RED — Test-Erwartungen umstellen**

In `__tests__/app/register-pilot-role.test.tsx` Zeile 60:
```ts
// alt
expect(screen.getByText("Wie nutzen Sie Nachbar.io im Pilot?")).toBeInTheDocument();
// neu
expect(
  screen.getByText("Wie nutzen Sie die QuartierApp im Pilot?"),
).toBeInTheDocument();
```

Falls `register-entry.test.tsx` Brand-Asserts hat (Pre-Read zeigt das),
analog umstellen. Falls nein, einen neuen Brand-Assert hinzufügen:

```ts
it("zeigt die QuartierApp als Brand im Hero", () => {
  render(<RegisterStepEntry state={buildState()} setState={vi.fn()} setStep={vi.fn()} />);
  expect(screen.getByText(/Die QuartierApp/i)).toBeInTheDocument();
});
```

**Step 2: Run to verify FAIL**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-pilot-role.test.tsx __tests__/app/register-entry.test.tsx
```
Expected: FAIL — Texte enthalten noch „Nachbar.io".

**Step 3: GREEN — String-Replacements**

Per Edit-Tool jeweils einzelne Replacements:

| Datei | alt | neu |
|---|---|---|
| `app/(auth)/register/page.tsx:108` | `Nachbar.io` | `QuartierApp` |
| `RegisterStepEntry.tsx:26` | `Nachbar.io soll Menschen` | `Die QuartierApp soll Menschen` |
| `RegisterStepEntry.tsx:63` | `Warum gibt es Nachbar.io?` | `Warum gibt es die QuartierApp?` |
| `RegisterStepPilotRole.tsx:49` | `wie Sie Nachbar.io im Pilot nutzen` | `wie Sie die QuartierApp im Pilot nutzen` |
| `RegisterStepPilotRole.tsx:61` | `Wie nutzen Sie Nachbar.io im Pilot?` | `Wie nutzen Sie die QuartierApp im Pilot?` |
| `RegisterStepPilotRole.tsx:64` | `Nachbar.io lebt davon` | `Die QuartierApp lebt davon` |
| `RegisterStepPilotRole.tsx:102` | `Menschen, die Nachbar.io selbst nutzen.` | `Menschen, die die QuartierApp selbst nutzen.` |

**Step 4: Run to verify PASS**

```bash
cd "$REPO" && npx vitest run __tests__/app/register-pilot-role.test.tsx \
  __tests__/app/register-entry.test.tsx \
  __tests__/app/register-ai-consent.test.tsx
cd "$REPO" && npx tsc --noEmit
```
Expected: alle PASS.

**Step 5: Commit**

```bash
git -C "$REPO" add \
  app/\(auth\)/register/page.tsx \
  app/\(auth\)/register/components/RegisterStepEntry.tsx \
  app/\(auth\)/register/components/RegisterStepPilotRole.tsx \
  __tests__/app/register-pilot-role.test.tsx \
  __tests__/app/register-entry.test.tsx
git -C "$REPO" commit -m "refactor(register): use QuartierApp brand in onboarding copy (Y scope)"
```

---

## Task 8: Volle Verifikation des berührten Test-Subsets

**Step 1: Run all touched test files**

```bash
cd "$REPO" && npx vitest run \
  __tests__/app/register-types.test.ts \
  __tests__/app/register-ki-help-pulse-dot.test.tsx \
  __tests__/app/register-ai-consent.test.tsx \
  __tests__/app/register-pilot-role.test.tsx \
  __tests__/app/register-entry.test.tsx \
  __tests__/api/register-complete-bugfix.test.ts \
  __tests__/lib/registration-service-ai-level.test.ts
```
Expected: alle PASS.

**Step 2: Type-Check + Lint über alle berührten Dateien**

```bash
cd "$REPO" && npx tsc --noEmit
cd "$REPO" && npx eslint \
  app/\(auth\)/register/page.tsx \
  app/\(auth\)/register/components/RegisterStepAiConsent.tsx \
  app/\(auth\)/register/components/RegisterStepEntry.tsx \
  app/\(auth\)/register/components/RegisterStepPilotRole.tsx \
  app/\(auth\)/register/components/KiHelpPulseDot.tsx \
  app/\(auth\)/register/components/types.ts \
  app/api/register/complete/route.ts \
  lib/services/registration.service.ts
```
Expected: 0 errors.

**Step 3: Manueller Smoke (lokaler Dev gegen Cloud-DB)**

```bash
cd "$REPO" && npm run dev:cloud
```

Im Browser auf `http://localhost:3000/register` (oder aktuellem Port):

| Schritt | Erwartung |
|---|---|
| Entry-Screen | „Die QuartierApp soll Menschen ..." sichtbar |
| Invite-Code-Pfad mit `3WEA-VPXU`, AI-Test-Email `ai-test-aiconsent-<timestamp>@nachbar-pilot.local` | normalisiert zu valid:true |
| Identity-Step (Vorname, Nachname, Geb-Datum, Adresse) | füllen |
| Pilot-Role | „Wie nutzen Sie die QuartierApp im Pilot?" sichtbar, Auswahl `test_user` |
| AI-Consent | Title „Möchten Sie Unterstützung..."; Hero mit pulsierendem Punkt + 3 Bullet-Icons; Kontroll-Card; 4 wählbare Cards (Aus/Basis/Alltag/Später); Persönlich-Card disabled mit Lock-Icon; Submit disabled; nach Klick auf eine Card aktiv |
| Submit (z.B. Basis) | „Magic Link gesendet"-Step erscheint |
| DB-Verifikation via Supabase MCP | `users.settings.ai_assistance_level === "basic"`; `users.settings.ai_enabled === true`; `care_consents` Eintrag für `ai_onboarding`; `users.settings.is_test_user === true`; `must_delete_before_pilot === true` |
| prefers-reduced-motion | Browser-Setting auf reduce → Pulse-Animation statisch |

**Step 4: kein Commit nötig (rein read-only Verify)**

---

## Task 9: Topic + Memory + Final-Commit

**Files:**
- Modify: `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/topics/pilot-onboarding.md`
- Create: `~/.claude/projects/C--Users-thoma-Claud-Code-Handy-APP/memory/topics/ki-begleiter-stufen.md`
  (eigener Folge-Workstream für KI-Hilfe-Begleiter Phase 2)

**Step 1: Topic-Update**

In `topics/pilot-onboarding.md` den Block „Nächster Arbeitsblock
(Empfehlung Codex-Handover)" ergänzen:

```md
## Nächster Arbeitsblock (Empfehlung Codex-Handover)

1. ~~Rollen-Screen visuell auf Niveau des Einstiegs bringen.~~ — DONE
2. ~~KI-Einwilligungs-Screen warm, klar, vertrauensbildend~~ — **DONE 2026-04-27 abend** (4-Stufen-Polish + Pulse-Dot + QuartierApp-Brand)
3. Mobile-Screenshots prüfen.
4. Bei Bedarf Info-Panels kürzen (erster Eindruck nicht zu textlastig).
```

Plus neuen Punkt am Ende:

```md
## KI-Hilfe-Begleiter (Folge-Workstream)

Lia-/„KI-Hilfe"-Maskottchen mit Pre-Scripted Tour über alle Onboarding-
Steps und vordefinierter FAQ. Heute liefert der Polish nur den ersten
Touchpoint (statische Begrüßung + Pulse-Dot). Brainstorming + Plan
folgt im eigenen Workstream `topics/ki-begleiter-stufen.md`.
```

**Step 2: Neuen Topic-File anlegen**

```md
---
name: KI-Hilfe-Begleiter (Folge-Workstream)
description: Lia-/„KI-Hilfe"-Maskottchen mit Pre-Scripted Tour über das Onboarding und FAQ-Sheet. Brainstorming/Design steht aus. Funktional-Differenzierung Basis vs. Alltag im Backend gehört auch hierher.
type: project
---
# KI-Hilfe-Begleiter — geparkt nach Polish 2026-04-27

> Folge-Workstream nach erfolgreichem Polish des KI-Consent-Screens (Commit
> ⟨wird ergänzt⟩, 2026-04-27).

## Heute fertig (Touchpoint 1)

- Statische Begrüßung „Hallo, ich bin die KI-Hilfe der QuartierApp ..."
- KiHelpPulseDot-Visual (CSS-Pulse, prefers-reduced-motion).
- 4 Stufen-Cards (Aus/Basis/Alltag/Später) + 1 disabled Persönlich-Card.
- Backend-Wert `users.settings.ai_assistance_level` wird gespeichert.

## Geparkt für Phase 2

- Pre-Scripted Tour: bei jedem Step-Wechsel sagt der Begleiter einen
  vordefinierten Satz (rein client-seitig, kein LLM).
- FAQ-Sheet: Tap auf Pulse-Dot öffnet Bottom-Sheet mit vordefinierten
  Frage-Antwort-Paaren (kein LLM).
- Funktional-Differenzierung Basis vs. Alltag im Backend: heute werden
  beide Werte zu `ai_enabled=true` gemappt; in Phase 2 unterschiedliche
  Provider-Presets oder Token-Limits.
- AiHelpSettingsToggle-Erweiterung auf Stufen-Auswahl.

## Nicht ohne AVV

- Live-Q&A mit echtem LLM nach Consent.
- Persönlich-Stufe aktivieren.
```

**Step 3: Memory-Index-Pointer ergänzen**

In `memory/MEMORY.md` direkt unter `topics/pilot-onboarding.md` den
neuen Pointer einfügen:

```md
- [topics/ki-begleiter-stufen.md](topics/ki-begleiter-stufen.md) — KI-Hilfe-Begleiter Phase 2 (geparkt nach Polish 2026-04-27)
```

**Step 4: Final-Commit (Topic-Update separat)**

```bash
# Repo-seitig nichts mehr — Memory-Files liegen außerhalb des nachbar-io-Repos.
# Verify Topic-Files manuell (cat) und ggf. Whitespace nachziehen.
```

Memory-Files brauchen keinen git-Commit, weil sie unter
`~/.claude/projects/...` liegen.

---

## Abschluss-Bericht-Template

Am Ende der Implementation ein kurzes Status-Snapshot ans Founder-
Gespräch zurück:

```md
## KI-Consent-Polish — Δ-Bericht

| Block | Δ | Stand |
|---|---|---|
| Type-Erweiterung | Δ +X | ✅ |
| KiHelpPulseDot | Δ +X | ✅ |
| AiConsent RED + GREEN | Δ +X | ✅ |
| Backend ai_assistance_level | Δ +X | ✅ |
| API Whitelist | Δ +X | ✅ |
| Brand-Rename Y | Δ +X | ✅ |
| Verifikation + Smoke | Δ +X | ✅ |
| Topic + Memory | Δ +X | ✅ |

- Tests: <N> PASS, 0 FAIL
- tsc --noEmit: clean
- eslint: clean
- Smoke gegen localhost:3000 + Cloud-DB: Test-User <id> mit
  ai_assistance_level=basic angelegt (must_delete_before_pilot=true).
- Keine Pushs, kein Vercel-Deploy.
- Master jetzt <N+8> Commits ahead origin/master.
```

---

## DRY/YAGNI/Risiko-Reminders

- **DRY:** `levelToConsentChoice` liegt in der UI-Komponente, der
  äquivalente Mapping-Code im Service. Bewusst dupliziert (UI mappt
  Click→Body, Service hat Default-Fallback). Keine geteilte Lib-Datei
  bauen — YAGNI bis dritter Caller auftaucht.
- **YAGNI:** Persönlich-Card ist heute kein State, kein Mapping, keine
  Backend-Speicherung. Reines Visual mit Lock-Icon. Aktivieren erst
  wenn AVV steht.
- **TDD:** Jede Task RED-zuerst, kein Implementation-Code ohne RED-Run-
  Bestätigung.
- **Frequent commits:** 8 Commits geplant (Tasks 1–7 je einer + Topic-
  Update als möglicher Mini-Commit ans Repo). Kein „Big Bang"-Commit.
- **Kein Push.** Master bleibt 17→25 Commits ahead bis Founder-Go.

---

## Required Sub-Skill

Zur Ausführung: **superpowers:executing-plans** (oder
subagent-driven-development bei In-Session-Run).

