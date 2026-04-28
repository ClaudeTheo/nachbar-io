# Pre-Scripted Tour Visual Hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet, static KI-Hilfe orientation sentence to each register onboarding step.

**Architecture:** Use a small static content map keyed by the existing register `Step` type, plus one presentational component that reuses `KiHelpPulseDot` in decorative mode. Render the component centrally in `app/(auth)/register/page.tsx`, where the current step is already known.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind, Vitest + React Testing Library.

---

## Scope

Implement Variante A only:

- visible static text per register step
- no audio/TTS
- no OpenAI/Anthropic/Mistral call
- no backend/API
- no persist/localStorage/sessionStorage
- no browser speech APIs

Pre-check source: `docs/plans/2026-04-28-pre-scripted-tour-precheck.md`.

## Files

- Create `lib/ki-help/register-tour-content.ts`: static texts keyed by `Step`.
- Create `components/ki-help/KiHelpOnboardingHint.tsx`: presentational hint component.
- Modify `app/(auth)/register/page.tsx`: render the hint centrally under the progress text.
- Create `__tests__/lib/ki-help/register-tour-content.test.ts`: static content guard tests.
- Create `__tests__/components/ki-help/KiHelpOnboardingHint.test.tsx`: component tests.
- Create `__tests__/app/register-page-ki-help-hint.test.tsx`: page integration smoke.

## Task 1: Static Tour Content

**Files:**
- Create: `lib/ki-help/register-tour-content.ts`
- Test: `__tests__/lib/ki-help/register-tour-content.test.ts`

- [ ] **Step 1: Write the failing content test**

```ts
import { describe, expect, it } from "vitest";
import type { Step } from "@/app/(auth)/register/components/types";
import {
  REGISTER_TOUR_HINTS,
  getRegisterTourHint,
} from "@/lib/ki-help/register-tour-content";

const steps: Step[] = [
  "entry",
  "invite_code",
  "address",
  "identity",
  "pilot_role",
  "ai_consent",
  "magic_link_sent",
];

describe("REGISTER_TOUR_HINTS", () => {
  it("has exactly one calm static hint for every register step", () => {
    expect(Object.keys(REGISTER_TOUR_HINTS).sort()).toEqual([...steps].sort());
    for (const step of steps) {
      expect(getRegisterTourHint(step).trim().length).toBeGreaterThan(20);
    }
  });

  it("does not claim live AI, voice, calls, or storage", () => {
    for (const hint of Object.values(REGISTER_TOUR_HINTS)) {
      expect(hint).not.toMatch(/OpenAI|Anthropic|Mistral|Live-KI|Vorlesen|Stimme|Audio|gesendet|gespeichert/i);
    }
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx vitest run __tests__/lib/ki-help/register-tour-content.test.ts
```

Expected: fails because `@/lib/ki-help/register-tour-content` does not exist.

- [ ] **Step 3: Implement minimal content map**

```ts
import type { Step } from "@/app/(auth)/register/components/types";

export const REGISTER_TOUR_HINTS: Record<Step, string> = {
  entry:
    "Ich begleite Sie Schritt für Schritt. Zuerst wählen Sie, ob Sie mit Einladungscode starten oder Ihr Quartier suchen.",
  invite_code:
    "Der Einladungscode zeigt, dass Sie zum geschlossenen Test gehören. So bleibt der Pilot überschaubar.",
  address:
    "Ihre Adresse hilft, den richtigen Haushalt und das richtige Quartier zu finden. Sie wird nicht öffentlich angezeigt.",
  identity:
    "Name, Geburtsdatum und E-Mail helfen bei Vertrauen, Sicherheit und der eindeutigen Zuordnung im Pilot.",
  pilot_role:
    "Ihre Rolle hilft uns zu verstehen, ob Sie die App selbst nutzen, jemanden unterstützen oder nur testen.",
  ai_consent:
    "Hier entscheiden Sie in Ruhe, ob die KI-Hilfe aus bleibt, später helfen darf oder erst später gewählt wird.",
  magic_link_sent:
    "Fast geschafft. Mit dem Code aus Ihrer E-Mail bestätigen Sie den Zugang zur QuartierApp.",
};

export function getRegisterTourHint(step: Step) {
  return REGISTER_TOUR_HINTS[step];
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx vitest run __tests__/lib/ki-help/register-tour-content.test.ts
```

Expected: pass.

## Task 2: Hint Component

**Files:**
- Create: `components/ki-help/KiHelpOnboardingHint.tsx`
- Test: `__tests__/components/ki-help/KiHelpOnboardingHint.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KiHelpOnboardingHint } from "@/components/ki-help/KiHelpOnboardingHint";

describe("KiHelpOnboardingHint", () => {
  afterEach(() => cleanup());

  it("renders the static hint for the current register step", () => {
    render(<KiHelpOnboardingHint step="address" />);
    expect(screen.getByText(/Ihre Adresse hilft/i)).toBeInTheDocument();
    expect(screen.getByText(/nicht öffentlich angezeigt/i)).toBeInTheDocument();
  });

  it("uses the existing pulse dot as decorative visual, not a second FAQ trigger", () => {
    render(<KiHelpOnboardingHint step="entry" />);
    expect(screen.getByText(/Ich begleite Sie Schritt für Schritt/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx vitest run __tests__/components/ki-help/KiHelpOnboardingHint.test.tsx
```

Expected: fails because `KiHelpOnboardingHint` does not exist.

- [ ] **Step 3: Implement presentational component**

```tsx
"use client";

import { KiHelpPulseDot } from "@/components/ki-help/KiHelpPulseDot";
import { getRegisterTourHint } from "@/lib/ki-help/register-tour-content";
import type { Step } from "@/app/(auth)/register/components/types";

interface KiHelpOnboardingHintProps {
  step: Step;
}

export function KiHelpOnboardingHint({ step }: KiHelpOnboardingHintProps) {
  return (
    <div className="mt-3 rounded-xl border border-quartier-green/20 bg-quartier-green/5 p-3 text-left">
      <div className="flex items-start gap-3">
        <KiHelpPulseDot className="mt-0.5" />
        <p className="text-sm leading-relaxed text-anthrazit">
          {getRegisterTourHint(step)}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx vitest run __tests__/components/ki-help/KiHelpOnboardingHint.test.tsx
```

Expected: pass.

## Task 3: Register Page Integration

**Files:**
- Modify: `app/(auth)/register/page.tsx`
- Test: `__tests__/app/register-page-ki-help-hint.test.tsx`

- [ ] **Step 1: Write the failing page integration test**

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/(auth)/register/page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(),
    },
  }),
}));

describe("RegisterPage KI-Hilfe onboarding hint", () => {
  afterEach(() => cleanup());

  it("shows the first static KI-Hilfe orientation hint in the register shell", async () => {
    render(<RegisterPage />);
    expect(
      await screen.findByText(/Ich begleite Sie Schritt für Schritt/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
npx vitest run __tests__/app/register-page-ki-help-hint.test.tsx
```

Expected: fails because the register shell does not render the hint.

- [ ] **Step 3: Add central render in page**

Add:

```tsx
import { KiHelpOnboardingHint } from "@/components/ki-help/KiHelpOnboardingHint";
```

Then render inside the progress block, after the `Schritt ... von ...` paragraph:

```tsx
<KiHelpOnboardingHint step={step} />
```

- [ ] **Step 4: Run GREEN**

Run:

```bash
npx vitest run __tests__/app/register-page-ki-help-hint.test.tsx
```

Expected: pass.

## Task 4: Verification

- [ ] **Step 1: Run focused test subset**

```bash
npx vitest run \
  __tests__/lib/ki-help/register-tour-content.test.ts \
  __tests__/components/ki-help/KiHelpOnboardingHint.test.tsx \
  __tests__/app/register-page-ki-help-hint.test.tsx \
  __tests__/app/register-ai-consent.test.tsx \
  __tests__/components/ki-help/KiHelpFaqSheet.test.tsx
```

Expected: all pass.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: ESLint touched files**

```bash
npx eslint \
  lib/ki-help/register-tour-content.ts \
  components/ki-help/KiHelpOnboardingHint.tsx \
  app/\(auth\)/register/page.tsx \
  __tests__/lib/ki-help/register-tour-content.test.ts \
  __tests__/components/ki-help/KiHelpOnboardingHint.test.tsx \
  __tests__/app/register-page-ki-help-hint.test.tsx
```

Expected: exit 0.

## Notes

- Do not touch `.codex-*.log`, `.playwright-cli/`, `output/`, old untracked plans, production DB, Vercel, or remotes.
- Do not add local speech recognition in this block.
- Future local voice helper is a separate product/design block.
