# AI-Stufen-Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nutzer können ihre KI-Hilfe-Stufe nach dem Onboarding in `Mein Gedächtnis` ändern: Aus, Basis, Alltag; Persönlich bleibt sichtbar gesperrt.

**Architecture:** Bestehende Onboarding-Cards werden in eine gemeinsame `AiAssistanceLevelPicker`-Komponente extrahiert. `AiHelpSettingsToggle` bleibt der Settings-Container, wechselt aber vom binären Switch auf Stufen-Cards. `/api/settings/ai` bleibt die API-Grenze und delegiert Consent-Threshold-Logik an `lib/ai/user-settings.ts`.

**Tech Stack:** Next.js App Router, React Client Components, TypeScript, Tailwind, Supabase-Client-Shape, Vitest, Testing Library.

---

## Scope

In Scope:

- Gemeinsame Level-Typen und Optionen in `lib/ki-help/ai-assistance-levels.ts`.
- Neue UI-Komponente `components/ki-help/AiAssistanceLevelPicker.tsx`.
- Onboarding-Refactor in `RegisterStepAiConsent.tsx` ohne Verhaltensänderung.
- Settings-Refactor in `modules/ai/components/AiHelpSettingsToggle.tsx`.
- `/api/settings/ai` akzeptiert neuen Body `{ ai_assistance_level }` und alten Body `{ ai_enabled }`.
- `lib/ai/user-settings.ts` setzt `ai_enabled`, `ai_assistance_level`, Audit-Log und `ai_onboarding`-Consent zentral.

Out of Scope:

- Kein Push, kein Deploy, keine Prod-DB, keine Migration.
- Kein LLM-Call, kein TTS, keine Persönlich-Aktivierung.
- Kein Sunset des alten `{ ai_enabled }`-POST-Pfads.
- Keine Änderungen an `app/api/register/complete/route.ts` außer falls TypeScript durch den Type-Move einen Import-Fix erzwingt.

## Pre-Check Ergebnis

Ausgeführt vor Planerstellung:

```powershell
rg -n "AiAssistanceLevel|ai_assistance_level|aiAssistanceLevel|setAiHelpEnabled|getAiHelpState|AiHelpSettingsToggle|/api/settings/ai|settings/ai|updateConsents|KiHelpPulseDot|RegisterStepAiConsent" app components lib modules __tests__ docs/plans -g "*.ts" -g "*.tsx" -g "*.md"
rg --files app components lib modules __tests__ | rg "(ai|ki-help|settings|register|user-settings|consent)"
```

Gefundene bestehende Infrastruktur:

| Bereich | Existiert in | Konsequenz |
|---|---|---|
| Onboarding-Level-Typ | `app/(auth)/register/components/types.ts` | Type wird neutral verschoben, Register-Datei re-exportiert. |
| Onboarding-Cards | `app/(auth)/register/components/RegisterStepAiConsent.tsx` | Cards werden in Picker extrahiert. |
| KI-Settings-UI | `modules/ai/components/AiHelpSettingsToggle.tsx` | Kein Neubau der Seite, nur Container-Refactor. |
| Settings-API | `app/api/settings/ai/route.ts` | Route erweitern, nicht ersetzen. |
| User-Settings-Service | `lib/ai/user-settings.ts` | Neue Level-Funktion ergänzt, alter Wrapper bleibt. |
| Consent-Service | `modules/care/services/consent-routes.service.ts` | Weiterverwenden; Aufruf wandert aus Route in Service. |
| KiHelp UI | `components/ki-help/*` | Picker dort ergänzen. |

## File Structure

Create:

- `lib/ki-help/ai-assistance-levels.ts` — neutraler Typ, Optionen, Helper.
- `components/ki-help/AiAssistanceLevelPicker.tsx` — geteilte Stufen-Card-UI.
- `__tests__/lib/ki-help/ai-assistance-levels.test.ts` — Level-Optionen und Helper.
- `__tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx` — Picker-Verhalten.
- `__tests__/components/AiHelpSettingsToggle.test.tsx` — Settings-Container.
- `__tests__/api/settings-ai-level.test.ts` — API-Route.

Modify:

- `app/(auth)/register/components/types.ts` — `AiAssistanceLevel` re-exportieren.
- `app/(auth)/register/components/RegisterStepAiConsent.tsx` — Inline-Cards durch Picker ersetzen.
- `__tests__/app/register-types.test.ts` — Import bleibt grün über Re-Export.
- `__tests__/app/register-ai-consent.test.tsx` — nur falls nötig: Persönlich-Card als gesperrt über `aria-disabled` prüfen, Onboarding darf aber weiterhin kein State-Change auslösen.
- `modules/ai/components/AiHelpSettingsToggle.tsx` — Switch zu Picker + Inline-Hinweis.
- `app/api/settings/ai/route.ts` — Body-Validation + Service-Delegation.
- `lib/ai/user-settings.ts` — Level-State, Wrapper, Consent-Threshold.
- `__tests__/lib/ai-user-settings.test.ts` — bestehende Tests erweitern.

---

## Task 1: Neutrale AI-Level-Typen

**Files:**
- Create: `lib/ki-help/ai-assistance-levels.ts`
- Create: `__tests__/lib/ki-help/ai-assistance-levels.test.ts`
- Modify: `app/(auth)/register/components/types.ts`

- [ ] **Step 1.1: Write failing helper tests**

Create `__tests__/lib/ki-help/ai-assistance-levels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AI_ASSISTANCE_LEVELS,
  LEVEL_OPTIONS,
  deriveEnabledFromLevel,
  getLevelOptionsForMode,
  isActiveAiAssistanceLevel,
  isAiAssistanceLevel,
  levelToConsentChoice,
} from "@/lib/ki-help/ai-assistance-levels";

describe("ai-assistance-levels", () => {
  it("defines the four persisted levels", () => {
    expect(AI_ASSISTANCE_LEVELS).toEqual([
      "off",
      "basic",
      "everyday",
      "later",
    ]);
  });

  it("provides stable labels and mode filters", () => {
    expect(LEVEL_OPTIONS.map((option) => option.level)).toEqual([
      "off",
      "basic",
      "everyday",
      "later",
    ]);
    expect(getLevelOptionsForMode("onboarding").map((option) => option.level))
      .toEqual(["off", "basic", "everyday", "later"]);
    expect(getLevelOptionsForMode("settings").map((option) => option.level))
      .toEqual(["off", "basic", "everyday"]);
  });

  it("derives enabled state only for active levels", () => {
    expect(deriveEnabledFromLevel("off")).toBe(false);
    expect(deriveEnabledFromLevel("later")).toBe(false);
    expect(deriveEnabledFromLevel("basic")).toBe(true);
    expect(deriveEnabledFromLevel("everyday")).toBe(true);
  });

  it("guards arbitrary input", () => {
    expect(isAiAssistanceLevel("basic")).toBe(true);
    expect(isAiAssistanceLevel("personal")).toBe(false);
    expect(isAiAssistanceLevel(["basic"])).toBe(false);
  });

  it("maps onboarding consent choices consistently", () => {
    expect(levelToConsentChoice("off")).toBe("no");
    expect(levelToConsentChoice("basic")).toBe("yes");
    expect(levelToConsentChoice("everyday")).toBe("yes");
    expect(levelToConsentChoice("later")).toBe("later");
  });

  it("marks only basis and everyday as active AI levels", () => {
    expect(isActiveAiAssistanceLevel("off")).toBe(false);
    expect(isActiveAiAssistanceLevel("later")).toBe(false);
    expect(isActiveAiAssistanceLevel("basic")).toBe(true);
    expect(isActiveAiAssistanceLevel("everyday")).toBe(true);
  });
});
```

- [ ] **Step 1.2: Run test to verify RED**

Run:

```powershell
npx vitest run __tests__/lib/ki-help/ai-assistance-levels.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/ki-help/ai-assistance-levels'`.

- [ ] **Step 1.3: Add neutral helper implementation**

Create `lib/ki-help/ai-assistance-levels.ts`:

```ts
import type { ComponentType } from "react";
import { BookOpen, Clock, PowerOff, Sparkles } from "lucide-react";

export const AI_ASSISTANCE_LEVELS = [
  "off",
  "basic",
  "everyday",
  "later",
] as const;

export type AiAssistanceLevel = (typeof AI_ASSISTANCE_LEVELS)[number];
export type AiAssistanceLevelMode = "onboarding" | "settings";
export type AiConsentChoice = "yes" | "no" | "later";

export interface LevelOption {
  level: AiAssistanceLevel;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  modes: readonly AiAssistanceLevelMode[];
}

export const LEVEL_OPTIONS: readonly LevelOption[] = [
  {
    level: "off",
    label: "Aus",
    description: "Die KI-Hilfe bleibt ausgeschaltet.",
    icon: PowerOff,
    modes: ["onboarding", "settings"],
  },
  {
    level: "basic",
    label: "Basis",
    description:
      "Nach Ihrer Einwilligung: erklären, vorlesen und einfache Hilfe in der App.",
    icon: BookOpen,
    modes: ["onboarding", "settings"],
  },
  {
    level: "everyday",
    label: "Alltag",
    description:
      "Nach Ihrer Einwilligung: beim Formulieren, Verstehen und bei kleinen Fragen helfen.",
    icon: Sparkles,
    modes: ["onboarding", "settings"],
  },
  {
    level: "later",
    label: "Später entscheiden",
    description: "Sie entscheiden später in den Einstellungen.",
    icon: Clock,
    modes: ["onboarding"],
  },
];

export function getLevelOptionsForMode(mode: AiAssistanceLevelMode) {
  return LEVEL_OPTIONS.filter((option) => option.modes.includes(mode));
}

export function isAiAssistanceLevel(input: unknown): input is AiAssistanceLevel {
  return (
    typeof input === "string" &&
    (AI_ASSISTANCE_LEVELS as readonly string[]).includes(input)
  );
}

export function deriveEnabledFromLevel(level: AiAssistanceLevel): boolean {
  return level === "basic" || level === "everyday";
}

export function isActiveAiAssistanceLevel(level: AiAssistanceLevel): boolean {
  return deriveEnabledFromLevel(level);
}

export function levelToConsentChoice(
  level: AiAssistanceLevel,
): AiConsentChoice {
  if (level === "basic" || level === "everyday") return "yes";
  if (level === "off") return "no";
  return "later";
}
```

Modify `app/(auth)/register/components/types.ts`:

```ts
import type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";
export type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";
```

Remove the old inline declaration:

```ts
export type AiAssistanceLevel = "off" | "basic" | "everyday" | "later";
```

- [ ] **Step 1.4: Run focused tests**

Run:

```powershell
npx vitest run __tests__/lib/ki-help/ai-assistance-levels.test.ts __tests__/app/register-types.test.ts
```

Expected: PASS.

- [ ] **Step 1.5: Commit**

```powershell
git add lib/ki-help/ai-assistance-levels.ts __tests__/lib/ki-help/ai-assistance-levels.test.ts "app/(auth)/register/components/types.ts"
git commit -m "feat(ki-help): add shared ai assistance levels"
```

---

## Task 2: AiAssistanceLevelPicker

**Files:**
- Create: `components/ki-help/AiAssistanceLevelPicker.tsx`
- Create: `__tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx`

- [ ] **Step 2.1: Write failing picker tests**

Create `__tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiAssistanceLevelPicker } from "@/components/ki-help/AiAssistanceLevelPicker";

describe("AiAssistanceLevelPicker", () => {
  afterEach(() => cleanup());

  it("renders onboarding levels including Spaeter plus locked Persoenlich", () => {
    render(
      <AiAssistanceLevelPicker
        mode="onboarding"
        value={null}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Aus\s/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Basis/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Alltag/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Später entscheiden/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /Persönlich/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("renders settings levels without Spaeter entscheiden", () => {
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="basic"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Aus\s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^Alltag/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Später entscheiden/i }),
    ).toBeNull();
  });

  it("calls onChange with the selected level", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="off"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Alltag/i }));
    expect(onChange).toHaveBeenCalledWith("everyday");
  });

  it("keeps locked Persoenlich out of onChange and calls onLockedClick", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onLockedClick = vi.fn();
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="basic"
        onChange={onChange}
        onLockedClick={onLockedClick}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Persönlich/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onLockedClick).toHaveBeenCalledTimes(1);
  });

  it("uses senior-size touch targets for level cards", () => {
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="off"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Aus\s/i })).toHaveClass(
      "min-h-[80px]",
    );
  });

  it("can be disabled while saving", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AiAssistanceLevelPicker
        mode="settings"
        value="off"
        onChange={onChange}
        disabled
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Basis/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2.2: Run test to verify RED**

Run:

```powershell
npx vitest run __tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx
```

Expected: FAIL with `Cannot find module '@/components/ki-help/AiAssistanceLevelPicker'`.

- [ ] **Step 2.3: Add picker implementation**

Create `components/ki-help/AiAssistanceLevelPicker.tsx`:

```tsx
"use client";

import { CheckCircle2, Lock } from "lucide-react";
import {
  getLevelOptionsForMode,
  type AiAssistanceLevel,
  type AiAssistanceLevelMode,
} from "@/lib/ki-help/ai-assistance-levels";

interface AiAssistanceLevelPickerProps {
  value: AiAssistanceLevel | null;
  onChange: (level: AiAssistanceLevel) => void;
  mode: AiAssistanceLevelMode;
  onLockedClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AiAssistanceLevelPicker({
  value,
  onChange,
  mode,
  onLockedClick,
  disabled = false,
  className,
}: AiAssistanceLevelPickerProps) {
  const options = getLevelOptionsForMode(mode);

  return (
    <div className={"grid gap-3 " + (className ?? "")}>
      {options.map(({ level, label, description, icon: Icon }) => (
        <button
          key={level}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level)}
          className={`min-h-[80px] w-full rounded-lg border-2 p-4 text-left transition-colors ${
            value === level
              ? "border-quartier-green bg-quartier-green/5"
              : "border-border hover:border-quartier-green/50"
          }`}
          aria-pressed={value === level}
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
            {value === level && (
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
        aria-disabled="true"
        disabled={mode === "onboarding" || disabled}
        onClick={() => {
          if (!disabled) onLockedClick?.();
        }}
        className="min-h-[80px] w-full cursor-not-allowed rounded-lg border-2 border-dashed border-border/60 bg-muted/30 p-4 text-left opacity-70"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-anthrazit">Persönlich (später)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nur mit ausdrücklicher Einwilligung und aktiven Schutzmaßnahmen,
              kommt mit Phase 2 nach Freigabe.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
```

Implementation note: In onboarding mode the locked card is a real disabled button to preserve current tests. In settings mode it remains `aria-disabled="true"` but clickable so the inline explanation can open.

- [ ] **Step 2.4: Run picker tests**

Run:

```powershell
npx vitest run __tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx
```

Expected: PASS.

- [ ] **Step 2.5: Commit**

```powershell
git add components/ki-help/AiAssistanceLevelPicker.tsx __tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx
git commit -m "feat(ki-help): add ai assistance level picker"
```

---

## Task 3: Onboarding Uses Shared Picker

**Files:**
- Modify: `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- Test: `__tests__/app/register-ai-consent.test.tsx`

- [ ] **Step 3.1: Run existing Onboarding tests before refactor**

Run:

```powershell
npx vitest run __tests__/app/register-ai-consent.test.tsx __tests__/app/register-types.test.ts
```

Expected: PASS before editing.

- [ ] **Step 3.2: Replace inline level card code**

Modify `RegisterStepAiConsent.tsx`:

```tsx
import { ArrowLeft, MessageCircleQuestion, Mic, ShieldCheck, Volume2 } from "lucide-react";
import { AiAssistanceLevelPicker } from "@/components/ki-help/AiAssistanceLevelPicker";
import { levelToConsentChoice } from "@/lib/ki-help/ai-assistance-levels";
import type { AiAssistanceLevel, StepProps } from "./types";
```

Remove imports no longer used by this file:

```tsx
BookOpen,
CheckCircle2,
Clock,
Lock,
PowerOff,
Sparkles,
```

Remove the local `LevelOption`, `LEVEL_OPTIONS`, and `levelToConsentChoice` declarations.

Replace the current card grid:

```tsx
<div className="grid gap-3">
  {LEVEL_OPTIONS.map(...)}
  <button type="button" disabled aria-disabled="true">...</button>
</div>
```

with:

```tsx
<AiAssistanceLevelPicker
  mode="onboarding"
  value={selectedLevel}
  onChange={chooseLevel}
  disabled={state.loading}
/>
```

- [ ] **Step 3.3: Run Onboarding tests**

Run:

```powershell
npx vitest run __tests__/app/register-ai-consent.test.tsx __tests__/app/register-types.test.ts __tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx
```

Expected: PASS. If the Persönlich assertion fails, keep the component behavior from Task 2: onboarding locked card must be a disabled button.

- [ ] **Step 3.4: Commit**

```powershell
git add "app/(auth)/register/components/RegisterStepAiConsent.tsx" __tests__/app/register-ai-consent.test.tsx
git commit -m "refactor(register): use shared ai assistance level picker"
```

---

## Task 4: Settings Container Uses Stufen-Cards

**Files:**
- Modify: `modules/ai/components/AiHelpSettingsToggle.tsx`
- Create: `__tests__/components/AiHelpSettingsToggle.test.tsx`

- [ ] **Step 4.1: Write failing container tests**

Create `__tests__/components/AiHelpSettingsToggle.test.tsx`:

```tsx
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiHelpSettingsToggle } from "@/modules/ai/components/AiHelpSettingsToggle";

describe("AiHelpSettingsToggle", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (input, init) => {
      if (!init) {
        return new Response(
          JSON.stringify({ enabled: true, assistanceLevel: "basic" }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({ enabled: true, assistanceLevel: "everyday" }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => cleanup());

  it("loads the current assistance level and marks Basis", async () => {
    render(<AiHelpSettingsToggle />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(
      screen.queryByRole("button", { name: /Später entscheiden/i }),
    ).toBeNull();
  });

  it("posts ai_assistance_level when a settings level changes", async () => {
    const user = userEvent.setup();
    render(<AiHelpSettingsToggle />);

    await screen.findByRole("button", { name: /^Alltag/i });
    await user.click(screen.getByRole("button", { name: /^Alltag/i }));

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_assistance_level: "everyday" }),
    });
  });

  it("shows and dismisses the locked Persoenlich hint", async () => {
    const user = userEvent.setup();
    render(<AiHelpSettingsToggle />);

    await user.click(await screen.findByRole("button", { name: /Persönlich/i }));
    expect(
      screen.getByText("Persönlich ist noch gesperrt."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Wir informieren Sie dann/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hinweis schließen/i }));
    expect(
      screen.queryByText("Persönlich ist noch gesperrt."),
    ).not.toBeInTheDocument();
  });

  it("rolls optimistic selection back on save failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(async (_input, init) => {
      if (!init) {
        return new Response(
          JSON.stringify({ enabled: true, assistanceLevel: "basic" }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "fail" }), { status: 500 });
    }) as unknown as typeof fetch;

    render(<AiHelpSettingsToggle />);

    await screen.findByRole("button", { name: /^Basis/i });
    await user.click(screen.getByRole("button", { name: /^Alltag/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(
      screen.getByText("KI-Einstellung konnte nicht gespeichert werden."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4.2: Run test to verify RED**

Run:

```powershell
npx vitest run __tests__/components/AiHelpSettingsToggle.test.tsx
```

Expected: FAIL because the current component renders a Switch and posts `{ ai_enabled }`.

- [ ] **Step 4.3: Implement Settings container refactor**

Replace `modules/ai/components/AiHelpSettingsToggle.tsx` with this structure:

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, X } from "lucide-react";
import { AiAssistanceLevelPicker } from "@/components/ki-help/AiAssistanceLevelPicker";
import type { AiAssistanceLevel } from "@/lib/ki-help/ai-assistance-levels";

type ApiState = {
  enabled?: boolean;
  assistanceLevel?: AiAssistanceLevel;
};

function levelFromApi(data: ApiState): AiAssistanceLevel {
  if (data.assistanceLevel) return data.assistanceLevel;
  return data.enabled === true ? "basic" : "off";
}

export function AiHelpSettingsToggle() {
  const [level, setLevel] = useState<AiAssistanceLevel>("off");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLockHint, setShowLockHint] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/ai")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: ApiState) => {
        if (!cancelled) {
          setLevel(levelFromApi(data));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("KI-Einstellung konnte nicht geladen werden.");
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateLevel(next: AiAssistanceLevel) {
    setError(null);
    const previous = level;
    setLevel(next);
    startTransition(async () => {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_assistance_level: next }),
      });
      if (!res.ok) {
        setLevel(previous);
        setError("KI-Einstellung konnte nicht gespeichert werden.");
        return;
      }
      const data = (await res.json()) as ApiState;
      setLevel(levelFromApi(data));
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-quartier-green" />
        <div>
          <p className="font-semibold text-anthrazit">KI-Hilfe verwenden</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vorlesen, Sprachbefehle und Assistent bleiben standardmässig aus.
            Die App funktioniert auch ohne KI-Hilfe.
          </p>
        </div>
      </div>

      <AiAssistanceLevelPicker
        className="mt-4"
        mode="settings"
        value={level}
        onChange={updateLevel}
        onLockedClick={() => setShowLockHint(true)}
        disabled={!loaded || isPending}
      />

      {showLockHint && (
        <div className="mt-3 rounded-lg border border-quartier-green/25 bg-quartier-green/5 p-3 text-sm text-anthrazit">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold">Persönlich ist noch gesperrt.</p>
              <p>
                Diese Stufe kommt mit Phase 2, sobald die nötigen
                Schutzmaßnahmen aktiv sind.
              </p>
              <p>
                Wir informieren Sie dann. Sie entscheiden neu, ob Sie diese
                Stufe nutzen möchten.
              </p>
            </div>
            <button
              type="button"
              aria-label="Hinweis schließen"
              onClick={() => setShowLockHint(false)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/70"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Ein Wechsel wird mit Zeitstempel im internen Audit-Log Ihres Accounts
        vermerkt. Personenbezogene KI-Nutzung bleibt zusätzlich durch
        Anbieterfreigabe und AVV-Status gesperrt.
      </p>
      {error && <p className="mt-2 text-sm text-emergency-red">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4.4: Run container tests**

Run:

```powershell
npx vitest run __tests__/components/AiHelpSettingsToggle.test.tsx __tests__/app/gedaechtnis-settings-page.test.tsx
```

Expected: PASS.

- [ ] **Step 4.5: Commit**

```powershell
git add modules/ai/components/AiHelpSettingsToggle.tsx __tests__/components/AiHelpSettingsToggle.test.tsx
git commit -m "feat(settings): choose ai assistance level in memory settings"
```

---

## Task 5: User Settings Service Handles Levels And Consent Thresholds

**Files:**
- Modify: `lib/ai/user-settings.ts`
- Modify: `__tests__/lib/ai-user-settings.test.ts`

- [ ] **Step 5.1: Extend service tests first**

Modify `__tests__/lib/ai-user-settings.test.ts` to mock `updateConsents` and add tests:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAiHelpState,
  setAiAssistanceLevel,
  setAiHelpEnabled,
} from "@/lib/ai/user-settings";

const mockUpdateConsents = vi.fn();

vi.mock("@/modules/care/services/consent-routes.service", () => ({
  updateConsents: (...args: unknown[]) => mockUpdateConsents(...args),
}));

function createUsersSettingsSupabase(settings: Record<string, unknown> | null) {
  const update = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table !== "users") {
      throw new Error(`Unexpected table: ${table}`);
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { settings }, error: null }),
        }),
      }),
      update: vi.fn((payload: unknown) => {
        update(payload);
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    };
  });

  return { supabase: { from }, update };
}

describe("AI user settings", () => {
  beforeEach(() => {
    mockUpdateConsents.mockReset();
  });

  it("defaults KI-Hilfe to off when users.settings has no flag", async () => {
    const { supabase } = createUsersSettingsSupabase({});

    await expect(getAiHelpState(supabase as never, "user-1")).resolves.toEqual({
      enabled: false,
      assistanceLevel: "off",
    });
  });

  it("reads existing assistanceLevel when present", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: true,
      ai_assistance_level: "everyday",
    });

    await expect(getAiHelpState(supabase as never, "user-1")).resolves.toEqual({
      enabled: true,
      assistanceLevel: "everyday",
    });
  });

  it("persists off to basic with audit log and consent grant", async () => {
    const { supabase, update } = createUsersSettingsSupabase({
      theme: "large",
      ai_enabled: false,
      ai_assistance_level: "off",
      ai_audit_log: [{ reason: "onboarding", from: "later", to: "off", at: "old" }],
    });

    await setAiAssistanceLevel(supabase as never, "user-1", "basic", "settings");

    expect(update).toHaveBeenCalledWith({
      settings: expect.objectContaining({
        theme: "large",
        ai_enabled: true,
        ai_assistance_level: "basic",
        ai_audit_log: [
          { reason: "onboarding", from: "later", to: "off", at: "old" },
          expect.objectContaining({ reason: "settings", from: "off", to: "basic" }),
        ],
      }),
    });
    expect(mockUpdateConsents).toHaveBeenCalledWith(
      supabase,
      "user-1",
      { ai_onboarding: true },
    );
  });

  it("persists basic to everyday without consent touch", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: true,
      ai_assistance_level: "basic",
    });

    await setAiAssistanceLevel(supabase as never, "user-1", "everyday", "settings");

    expect(mockUpdateConsents).not.toHaveBeenCalled();
  });

  it("persists everyday to off with consent revoke", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: true,
      ai_assistance_level: "everyday",
    });

    await setAiAssistanceLevel(supabase as never, "user-1", "off", "settings");

    expect(mockUpdateConsents).toHaveBeenCalledWith(
      supabase,
      "user-1",
      { ai_onboarding: false },
    );
  });

  it("treats later to basic as consent threshold crossing", async () => {
    const { supabase } = createUsersSettingsSupabase({
      ai_enabled: false,
      ai_assistance_level: "later",
    });

    await setAiAssistanceLevel(supabase as never, "user-1", "basic", "settings");

    expect(mockUpdateConsents).toHaveBeenCalledWith(
      supabase,
      "user-1",
      { ai_onboarding: true },
    );
  });

  it("keeps setAiHelpEnabled as wrapper for legacy callers", async () => {
    const { supabase, update } = createUsersSettingsSupabase({});

    await setAiHelpEnabled(supabase as never, "user-1", true, "settings");

    expect(update).toHaveBeenCalledWith({
      settings: expect.objectContaining({
        ai_enabled: true,
        ai_assistance_level: "basic",
      }),
    });
  });
});
```

- [ ] **Step 5.2: Run service tests to verify RED**

Run:

```powershell
npx vitest run __tests__/lib/ai-user-settings.test.ts
```

Expected: FAIL because `setAiAssistanceLevel` and `assistanceLevel` do not exist.

- [ ] **Step 5.3: Implement service changes**

Modify `lib/ai/user-settings.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkCareConsent } from "@/lib/care/consent";
import { isFeatureEnabledServer } from "@/lib/feature-flags-server";
import { ServiceError } from "@/lib/services/service-error";
import { updateConsents } from "@/modules/care/services/consent-routes.service";
import {
  deriveEnabledFromLevel,
  isAiAssistanceLevel,
  type AiAssistanceLevel,
} from "@/lib/ki-help/ai-assistance-levels";

export interface AiHelpState {
  enabled: boolean;
  assistanceLevel: AiAssistanceLevel;
}

function normalizeAssistanceLevel(settings: JsonObject): AiAssistanceLevel {
  if (isAiAssistanceLevel(settings.ai_assistance_level)) {
    return settings.ai_assistance_level;
  }
  return settings.ai_enabled === true ? "basic" : "off";
}
```

Change `getAiHelpState` return:

```ts
const settings = normalizeSettings(data?.settings);
const assistanceLevel = normalizeAssistanceLevel(settings);
return {
  enabled: deriveEnabledFromLevel(assistanceLevel),
  assistanceLevel,
};
```

Add new setter and make wrapper delegate:

```ts
export async function setAiAssistanceLevel(
  supabase: SupabaseClient,
  userId: string,
  level: AiAssistanceLevel,
  reason: string,
): Promise<AiHelpState> {
  const { data, error } = await supabase
    .from("users")
    .select("settings")
    .eq("id", userId)
    .single();

  if (error) {
    throw new ServiceError("KI-Einstellungen konnten nicht geladen werden.", 500);
  }

  const settings = normalizeSettings(data?.settings);
  const previousLevel = normalizeAssistanceLevel(settings);
  const previousEnabled = deriveEnabledFromLevel(previousLevel);
  const nextEnabled = deriveEnabledFromLevel(level);
  const existingLog = Array.isArray(settings.ai_audit_log)
    ? settings.ai_audit_log
    : [];

  const nextSettings = {
    ...settings,
    ai_enabled: nextEnabled,
    ai_assistance_level: level,
    ai_audit_log: [
      ...existingLog.slice(-49),
      {
        at: new Date().toISOString(),
        reason,
        from: previousLevel,
        to: level,
      },
    ],
  };

  const { error: updateError } = await supabase
    .from("users")
    .update({ settings: nextSettings })
    .eq("id", userId);

  if (updateError) {
    throw new ServiceError("KI-Einstellungen konnten nicht gespeichert werden.", 500);
  }

  if (previousEnabled !== nextEnabled) {
    await updateConsents(supabase, userId, { ai_onboarding: nextEnabled });
  }

  return { enabled: nextEnabled, assistanceLevel: level };
}

export async function setAiHelpEnabled(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
  source: string,
): Promise<AiHelpState> {
  return setAiAssistanceLevel(
    supabase,
    userId,
    enabled ? "basic" : "off",
    source,
  );
}
```

Keep `canUsePersonalAi` unchanged except that `state.enabled` still exists.

- [ ] **Step 5.4: Run service and dependent route tests**

Run:

```powershell
npx vitest run __tests__/lib/ai-user-settings.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts
```

Expected: PASS.

- [ ] **Step 5.5: Commit**

```powershell
git add lib/ai/user-settings.ts __tests__/lib/ai-user-settings.test.ts
git commit -m "feat(ai): persist assistance level in user settings"
```

---

## Task 6: Settings API Accepts ai_assistance_level

**Files:**
- Modify: `app/api/settings/ai/route.ts`
- Create: `__tests__/api/settings-ai-level.test.ts`

- [ ] **Step 6.1: Write failing API tests**

Create `__tests__/api/settings-ai-level.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mockRequireAuth = vi.fn();
const mockGetAiHelpState = vi.fn();
const mockSetAiAssistanceLevel = vi.fn();
const mockSetAiHelpEnabled = vi.fn();
const mockUpdateConsents = vi.fn();

vi.mock("@/lib/care/api-helpers", () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () =>
    NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 }),
  successResponse: (data: unknown, status = 200) =>
    NextResponse.json(data, { status }),
  errorResponse: (message: string, status: number) =>
    NextResponse.json({ error: message }, { status }),
}));

vi.mock("@/lib/ai/user-settings", () => ({
  getAiHelpState: (...args: unknown[]) => mockGetAiHelpState(...args),
  setAiAssistanceLevel: (...args: unknown[]) =>
    mockSetAiAssistanceLevel(...args),
  setAiHelpEnabled: (...args: unknown[]) => mockSetAiHelpEnabled(...args),
}));

vi.mock("@/modules/care/services/consent-routes.service", () => ({
  updateConsents: (...args: unknown[]) => mockUpdateConsents(...args),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/settings/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("/api/settings/ai level API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireAuth.mockResolvedValue({
      supabase: { from: vi.fn() },
      user: { id: "user-1" },
    });
    mockGetAiHelpState.mockResolvedValue({
      enabled: true,
      assistanceLevel: "basic",
    });
    mockSetAiAssistanceLevel.mockResolvedValue({
      enabled: true,
      assistanceLevel: "everyday",
    });
    mockSetAiHelpEnabled.mockResolvedValue({
      enabled: true,
      assistanceLevel: "basic",
    });
  });

  it("GET returns enabled and assistanceLevel", async () => {
    const { GET } = await import("@/app/api/settings/ai/route");
    const response = await GET({} as NextRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ enabled: true, assistanceLevel: "basic" });
    expect(mockGetAiHelpState).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
    );
  });

  it("POST ai_assistance_level delegates to setAiAssistanceLevel", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({ ai_assistance_level: "everyday" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ enabled: true, assistanceLevel: "everyday" });
    expect(mockSetAiAssistanceLevel).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "everyday",
      "settings",
    );
    expect(mockUpdateConsents).not.toHaveBeenCalled();
  });

  it("POST invalid ai_assistance_level returns 400", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({ ai_assistance_level: "personal" }));

    expect(response.status).toBe(400);
    expect(mockSetAiAssistanceLevel).not.toHaveBeenCalled();
  });

  it("POST legacy ai_enabled delegates to setAiHelpEnabled", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({ ai_enabled: true }));

    expect(response.status).toBe(200);
    expect(mockSetAiHelpEnabled).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      true,
      "settings",
    );
    expect(mockUpdateConsents).not.toHaveBeenCalled();
  });

  it("POST empty body returns 400", async () => {
    const { POST } = await import("@/app/api/settings/ai/route");
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 6.2: Run API tests to verify RED**

Run:

```powershell
npx vitest run __tests__/api/settings-ai-level.test.ts
```

Expected: FAIL because route still validates only `ai_enabled` and calls `updateConsents` directly.

- [ ] **Step 6.3: Implement route changes**

Modify `app/api/settings/ai/route.ts`:

```ts
import { NextRequest } from "next/server";
import {
  errorResponse,
  requireAuth,
  successResponse,
  unauthorizedResponse,
} from "@/lib/care/api-helpers";
import {
  getAiHelpState,
  setAiAssistanceLevel,
  setAiHelpEnabled,
} from "@/lib/ai/user-settings";
import {
  isAiAssistanceLevel,
  type AiAssistanceLevel,
} from "@/lib/ki-help/ai-assistance-levels";
import { ServiceError } from "@/lib/services/service-error";

export const dynamic = "force-dynamic";

type SettingsAiBody = {
  ai_enabled?: unknown;
  ai_assistance_level?: unknown;
};

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  try {
    return successResponse(await getAiHelpState(auth.supabase, auth.user.id));
  } catch (err) {
    if (err instanceof ServiceError) return errorResponse(err.message, err.status);
    return errorResponse("KI-Einstellungen konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth) return unauthorizedResponse();

  let body: SettingsAiBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Ungueltiger Request-Body.", 400);
  }

  try {
    if ("ai_assistance_level" in body) {
      if (!isAiAssistanceLevel(body.ai_assistance_level)) {
        return errorResponse(
          "ai_assistance_level ungueltig. Erlaubt: off, basic, everyday, later.",
          400,
        );
      }
      const state = await setAiAssistanceLevel(
        auth.supabase,
        auth.user.id,
        body.ai_assistance_level as AiAssistanceLevel,
        "settings",
      );
      return successResponse(state);
    }

    if (typeof body.ai_enabled === "boolean") {
      const state = await setAiHelpEnabled(
        auth.supabase,
        auth.user.id,
        body.ai_enabled,
        "settings",
      );
      return successResponse(state);
    }

    return errorResponse(
      "ai_assistance_level oder ai_enabled erforderlich.",
      400,
    );
  } catch (err) {
    if (err instanceof ServiceError) return errorResponse(err.message, err.status);
    return errorResponse("KI-Einstellungen konnten nicht gespeichert werden.", 500);
  }
}
```

Remove this import from the route:

```ts
import { updateConsents } from "@/modules/care/services/consent-routes.service";
```

- [ ] **Step 6.4: Run API tests**

Run:

```powershell
npx vitest run __tests__/api/settings-ai-level.test.ts __tests__/lib/ai-user-settings.test.ts
```

Expected: PASS.

- [ ] **Step 6.5: Commit**

```powershell
git add app/api/settings/ai/route.ts __tests__/api/settings-ai-level.test.ts
git commit -m "feat(api): accept ai assistance level settings"
```

---

## Task 7: Final Verification And Handoff

**Files:**
- Modify: `docs/plans/handoff/INBOX.md`
- Optional modify: `docs/plans/2026-04-29-ai-stufen-settings-plan.md` only if implementation deviates from plan and needs a note.

- [ ] **Step 7.1: Run focused Vitest subset**

Run:

```powershell
npx vitest run __tests__/lib/ki-help/ai-assistance-levels.test.ts __tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx __tests__/app/register-ai-consent.test.tsx __tests__/components/AiHelpSettingsToggle.test.tsx __tests__/lib/ai-user-settings.test.ts __tests__/api/settings-ai-level.test.ts app/api/ai/onboarding/turn/__tests__/route.test.ts __tests__/app/gedaechtnis-settings-page.test.tsx
```

Expected: all listed tests PASS.

- [ ] **Step 7.2: Run TypeScript**

Run:

```powershell
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 7.3: Run ESLint on touched files**

Run:

```powershell
npx eslint lib/ki-help/ai-assistance-levels.ts components/ki-help/AiAssistanceLevelPicker.tsx "app/(auth)/register/components/types.ts" "app/(auth)/register/components/RegisterStepAiConsent.tsx" modules/ai/components/AiHelpSettingsToggle.tsx lib/ai/user-settings.ts app/api/settings/ai/route.ts __tests__/lib/ki-help/ai-assistance-levels.test.ts __tests__/components/ki-help/AiAssistanceLevelPicker.test.tsx __tests__/components/AiHelpSettingsToggle.test.tsx __tests__/lib/ai-user-settings.test.ts __tests__/api/settings-ai-level.test.ts
```

Expected: exits 0.

- [ ] **Step 7.4: Optional local browser smoke**

Only if a dev server is already intended for this implementation session. Do not touch Prod.

Run:

```powershell
npm run dev
```

Open local route:

```text
http://localhost:3000/einstellungen/gedaechtnis
```

Check:

- Settings page shows cards Aus/Basis/Alltag/Persönlich.
- Später entscheiden is not shown in settings.
- Clicking Persönlich shows inline hint.
- No network request is made to an LLM endpoint.
- No Prod DB write is performed manually.

- [ ] **Step 7.5: Mark INBOX done after implementation commit**

After the implementation commits and verification are complete, modify the Block-3 row:

```markdown
| done | codex | Block-3 AI-Stufen-Settings Plan + Implementation | `components/ki-help/*` + `lib/ki-help/*` + `lib/ai/user-settings.ts` + `modules/ai/components/AiHelpSettingsToggle.tsx` + `app/api/settings/ai/route.ts` | 2026-04-28 | block-3 implemented and verified locally in `<final-commit>` | 2026-04-29 |
```

Then commit:

```powershell
git add docs/plans/handoff/INBOX.md
git commit -m "docs(handoff): mark block 3 done"
```

## Self-Review

- Spec coverage: Design decisions 1-7 are covered by Tasks 1-6. Settings route stays existing path, settings UI has 3 selectable levels plus locked Persönlich, shared picker is reused by Onboarding, API derives `ai_enabled`, audit happens for every switch, consent only changes on inactive/active threshold crossing, locked card shows inline hint.
- Placeholder scan: No forbidden placeholder markers, no unfinished implementation steps, no hidden migration step, no external provider setup.
- Type consistency: `AiAssistanceLevel` is defined once in `lib/ki-help/ai-assistance-levels.ts`; register types re-export it; service and route use the same guard/helper names.
- Risk check: No push, no deploy, no Prod DB, no secrets. The plan touches only local code/tests/docs.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-04-29-ai-stufen-settings-plan.md`.

Recommended execution after Founder-Go: inline execution with `superpowers:executing-plans`, because Tasks 1-6 are tightly coupled and should be reviewed after each local commit. Subagent-driven execution is possible only if write scopes are split strictly by task and each worker starts from the latest commit.
