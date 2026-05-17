# Active 55 Comfort Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `comfort` UI mode a clear, selectable "Aktiv 55+" path for active older neighbors without creating a duplicate role.

**Architecture:** Reuse the existing four-mode infrastructure (`youth`, `active`, `comfort`, `senior`) and sharpen `comfort` as the 55+ active-neighbor experience. Registration should collect the desired UI mode before AI consent, profile switching should keep working, and dashboard copy/actions should make `active` and `comfort` feel meaningfully different.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React Testing Library, Vitest, Tailwind v4, Supabase `users.ui_mode`.

---

## Existing Context

The code already has the right foundation:

- `lib/user-modes.ts` defines `USER_UI_MODES = ["youth", "active", "comfort", "senior"]`.
- `supabase/migrations/195_generation_ui_modes.sql` allows `users.ui_mode IN ('youth', 'active', 'comfort', 'senior')`.
- `lib/auth/post-login-redirect.ts` redirects `active` and `comfort` to `/dashboard`, `senior` to `/kreis-start`, `youth` to `/jugend`.
- `app/(app)/profile/page.tsx` lets users switch UI mode via `UserModeChoiceCard`.
- `app/(app)/dashboard/hooks/useDashboardData.ts` reads `users.ui_mode` and maps it to `dashboardDensity`.
- `app/(app)/dashboard/page.tsx` already renders `UserModeFocusStrip mode={uiMode}` and uses `dashboardDensity === "calm"` for comfort spacing.
- Current registration always submits `uiMode: "active"` in `app/(auth)/register/components/RegisterStepAiConsent.tsx`.

Product decision for this plan:

- Keep database value `comfort`.
- User-facing label becomes `Aktiv 55+`.
- `active` remains the denser normal neighbor mode.
- `senior` remains the simplified safety-first mode, not a 55+ mode.

## Files

- Modify: `lib/user-modes.ts`
  - Update `comfort` label, description, surface copy, onboarding intro.
- Create: `lib/__tests__/user-modes.test.ts`
  - Lock the four-mode contract and the 55+ copy.
- Modify: `app/(auth)/register/components/types.ts`
  - Add `uiMode?: UserUiMode` to form state and add `"ui_mode"` to the step union.
- Create: `app/(auth)/register/components/RegisterStepUiMode.tsx`
  - New registration step for selecting `active`, `comfort`, or `senior`.
- Modify: `app/(auth)/register/components/index.ts`
  - Export `RegisterStepUiMode`.
- Modify: `app/(auth)/register/page.tsx`
  - Insert UI mode step between `pilot_role` and `ai_consent`.
  - Increase progress from 4 to 5 steps.
  - Add local preview route support for `ui_mode`.
- Modify: `app/(auth)/register/preview/[step]/page.tsx`
  - Add preview slug `ui-mode`.
- Modify: `app/(auth)/register/preview/RegisterPreviewForm.tsx`
  - Render the new preview step and progress count.
- Modify: `app/(auth)/register/components/RegisterStepPilotRole.tsx`
  - Continue to `ui_mode` instead of `ai_consent`.
- Modify: `app/(auth)/register/components/RegisterStepAiConsent.tsx`
  - Submit `uiMode: state.uiMode ?? "active"` instead of hard-coded `active`.
  - Back button returns to `ui_mode`.
- Create: `app/(auth)/register/components/RegisterStepUiMode.test.tsx`
  - Unit tests for selectable 55+ mode and navigation.
- Modify: `app/(app)/dashboard/page.tsx`
  - Make first quick action mode-aware: active = Gemeinschaft, comfort = Mein Tag, senior = Check-in.
- Create or modify: `__tests__/app/dashboard-ui-mode.test.tsx`
  - Regression tests for `active` vs `comfort` dashboard quick action.
- Modify: `components/modes/UserModeSurface.tsx`
  - Only if tests show compact cards need clearer 55+ copy or touch targets.
- Modify: `lib/help-content.ts`
  - Update legacy "Seniorenmodus" help text to mention `Aktiv 55+`, `Aktiv`, and `Einfach`.
- Documentation after implementation: `docs/plans/2026-05-17-active-55-comfort-mode-handover.md`
  - Short handoff with changed files, tests, and deploy status.

---

### Task 1: Lock Existing Mode Contract

**Files:**
- Create: `lib/__tests__/user-modes.test.ts`
- Modify: `lib/user-modes.ts`

- [ ] **Step 1: Write failing tests for the 55+ mode contract**

Create `lib/__tests__/user-modes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  USER_MODE_CONFIG,
  USER_UI_MODES,
  getUserModeConfig,
  isUserUiMode,
} from "@/lib/user-modes";

describe("user mode registry", () => {
  it("keeps exactly the four product UI modes", () => {
    expect(USER_UI_MODES).toEqual(["youth", "active", "comfort", "senior"]);
  });

  it("uses comfort as the selectable Aktiv 55+ mode", () => {
    const comfort = getUserModeConfig("comfort");

    expect(comfort.label).toBe("Aktiv 55+");
    expect(comfort.dashboardDensity).toBe("calm");
    expect(comfort.postLoginPath).toBe("/dashboard");
    expect(comfort.surface.eyebrow).toBe("Aktiv 55+");
    expect(comfort.surface.title).toMatch(/ruhig/i);
    expect(comfort.surface.subtitle).toMatch(/selbststaendig|selbstständig/i);
  });

  it("keeps active separate from Aktiv 55+", () => {
    expect(USER_MODE_CONFIG.active.label).toBe("Aktiv");
    expect(USER_MODE_CONFIG.active.dashboardDensity).toBe("standard");
    expect(USER_MODE_CONFIG.active.surface.title).not.toBe(
      USER_MODE_CONFIG.comfort.surface.title,
    );
  });

  it("recognizes only persisted ui_mode values", () => {
    expect(isUserUiMode("comfort")).toBe(true);
    expect(isUserUiMode("active_55")).toBe(false);
    expect(isUserUiMode("55plus")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run lib/__tests__/user-modes.test.ts
```

Expected: FAIL because `comfort.label` is currently `Komfort` and `surface.eyebrow` is currently `Komfortmodus`.

- [ ] **Step 3: Update `comfort` copy in `lib/user-modes.ts`**

Change only the `comfort` block and the `USER_MODE_ONBOARDING_INTROS.comfort` copy:

```ts
  comfort: {
    label: "Aktiv 55+",
    description: "Ruhiger Alltag, Nachbarschaft und klare Wege",
    postLoginPath: "/dashboard",
    dashboardDensity: "calm",
    surface: {
      eyebrow: "Aktiv 55+",
      title: "Ruhiger Überblick für aktive Nachbarn",
      subtitle:
        "Für Menschen, die die QuartierApp selbstständig nutzen und dabei größere Abstände, klare Prioritäten und weniger Dichte möchten.",
      visualIntent:
        "Entzerrte Oberfläche mit größeren Zielen, ruhiger Lesereihenfolge und Alltag vor Pflege.",
      primaryAction: { label: "Ruhig starten", href: "/dashboard" },
      secondaryAction: { label: "Mein Tag", href: "/my-day" },
      principles: [
        "Ruhiger Alltag",
        "Nachbarschaft bleibt sichtbar",
        "Sicherheit ohne Pflegegefühl",
      ],
    },
  },
```

Change onboarding intro:

```ts
  comfort: [
    "Ruhigere Übersicht, größere Abstände und klare Wege",
    "Gut für aktive Nachbarn ab 55, die selbstständig bleiben möchten",
  ],
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run lib/__tests__/user-modes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/user-modes.ts lib/__tests__/user-modes.test.ts
git commit -m "feat(modes): define active 55 comfort copy"
```

---

### Task 2: Add Registration UI Mode Step

**Files:**
- Modify: `app/(auth)/register/components/types.ts`
- Create: `app/(auth)/register/components/RegisterStepUiMode.tsx`
- Modify: `app/(auth)/register/components/index.ts`
- Create: `app/(auth)/register/components/RegisterStepUiMode.test.tsx`

- [ ] **Step 1: Write tests for the new step component**

Create `app/(auth)/register/components/RegisterStepUiMode.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RegisterStepUiMode } from "./RegisterStepUiMode";
import type { RegisterFormState, Step } from "./types";

function baseState(overrides: Partial<RegisterFormState> = {}): RegisterFormState {
  return {
    email: "test@example.invalid",
    displayName: "",
    firstName: "Test",
    lastName: "Person",
    dateOfBirth: "1966-01-01",
    inviteCode: "",
    householdId: "household-1",
    referrerId: null,
    verificationMethod: "invite_code",
    selectedAddress: null,
    houseNumber: "12",
    postalCode: "79713",
    city: "Bad Säckingen",
    geoQuarter: {
      quarter_id: "quarter-1",
      quarter_name: "Bad Säckingen",
      action: "join",
    },
    pilotRole: "resident",
    aiConsentChoice: "later",
    loading: false,
    geoLoading: false,
    error: null,
    ...overrides,
  };
}

describe("RegisterStepUiMode", () => {
  it("offers active, Aktiv 55+ and simple senior mode", () => {
    render(
      <RegisterStepUiMode
        state={baseState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Aktiv:/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Aktiv 55\+:/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Einfach:/i })).toBeInTheDocument();
    expect(screen.queryByText(/Jugend/i)).not.toBeInTheDocument();
  });

  it("stores comfort when Aktiv 55+ is selected", () => {
    const setState = vi.fn();

    render(
      <RegisterStepUiMode
        state={baseState()}
        setState={setState}
        setStep={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Aktiv 55\+:/i }));

    expect(setState).toHaveBeenCalledWith({ uiMode: "comfort", error: null });
  });

  it("requires a selection before continuing", () => {
    const setState = vi.fn();
    const setStep = vi.fn();

    render(
      <RegisterStepUiMode
        state={baseState({ uiMode: undefined })}
        setState={setState}
        setStep={setStep}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

    expect(setStep).not.toHaveBeenCalled();
    expect(setState).toHaveBeenCalledWith({
      error: "Bitte wählen Sie aus, welche Oberfläche Sie nutzen möchten.",
    });
  });

  it("continues to AI consent after a selection", () => {
    const setState = vi.fn();
    const setStep = vi.fn<(step: Step) => void>();

    render(
      <RegisterStepUiMode
        state={baseState({ uiMode: "comfort" })}
        setState={setState}
        setStep={setStep}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

    expect(setState).toHaveBeenCalledWith({ error: null });
    expect(setStep).toHaveBeenCalledWith("ai_consent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run app/(auth)/register/components/RegisterStepUiMode.test.tsx
```

PowerShell alternative:

```powershell
npx vitest run "app/(auth)/register/components/RegisterStepUiMode.test.tsx"
```

Expected: FAIL because `RegisterStepUiMode` does not exist and `RegisterFormState.uiMode` is not typed.

- [ ] **Step 3: Extend registration state types**

Modify `app/(auth)/register/components/types.ts`:

```ts
import type { UserUiMode } from "@/lib/user-modes";
```

Change `Step`:

```ts
export type Step =
  | "entry"
  | "invite_code"
  | "address"
  | "identity"
  | "pilot_role"
  | "ui_mode"
  | "ai_consent"
  | "magic_link_sent";
```

Add to `RegisterFormState`:

```ts
  uiMode?: UserUiMode;
```

- [ ] **Step 4: Implement `RegisterStepUiMode.tsx`**

Create `app/(auth)/register/components/RegisterStepUiMode.tsx`:

```tsx
"use client";

import { ArrowLeft, CheckCircle2, HandHeart, LayoutDashboard, ShieldCheck } from "lucide-react";
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
    helper: "Für Menschen, die viele Quartierfunktionen kompakt nutzen möchten.",
  },
  {
    mode: "comfort",
    icon: HandHeart,
    helper: "Für aktive Nachbarn ab 55: ruhiger, größer, klarer, ohne Pflegegefühl.",
  },
  {
    mode: "senior",
    icon: ShieldCheck,
    helper: "Für sehr einfache Bedienung mit großen Kacheln und Notruf zuerst.",
  },
];

export function RegisterStepUiMode({ state, setState, setStep }: StepProps) {
  function chooseMode(uiMode: UserUiMode) {
    setState({ uiMode, error: null });
  }

  function continueToAiConsent() {
    if (!state.uiMode) {
      setState({
        error: "Bitte wählen Sie aus, welche Oberfläche Sie nutzen möchten.",
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
          Welche Oberfläche passt zu Ihnen?
        </h2>
        <p className="text-sm text-muted-foreground">
          Sie können diese Auswahl später im Profil ändern.
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
          Zurück
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
```

- [ ] **Step 5: Export the component**

Modify `app/(auth)/register/components/index.ts`:

```ts
export { RegisterStepUiMode } from "./RegisterStepUiMode";
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```powershell
npx vitest run "app/(auth)/register/components/RegisterStepUiMode.test.tsx"
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/register/components/types.ts app/(auth)/register/components/RegisterStepUiMode.tsx app/(auth)/register/components/RegisterStepUiMode.test.tsx app/(auth)/register/components/index.ts
git commit -m "feat(registration): add ui mode selection"
```

PowerShell-safe add:

```powershell
git add "app/(auth)/register/components/types.ts" "app/(auth)/register/components/RegisterStepUiMode.tsx" "app/(auth)/register/components/RegisterStepUiMode.test.tsx" "app/(auth)/register/components/index.ts"
git commit -m "feat(registration): add ui mode selection"
```

---

### Task 3: Wire UI Mode Step Into Registration Flow

**Files:**
- Modify: `app/(auth)/register/page.tsx`
- Modify: `app/(auth)/register/preview/[step]/page.tsx`
- Modify: `app/(auth)/register/preview/RegisterPreviewForm.tsx`
- Modify: `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- Modify: `app/(auth)/register/components/RegisterStepAiConsent.tsx`

- [ ] **Step 1: Write failing tests for registration submit mode**

If there is no existing test for `RegisterStepAiConsent`, create `app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { RegisterStepAiConsent } from "./RegisterStepAiConsent";
import type { RegisterFormState } from "./types";

const signInWithOtp = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp,
    },
  }),
}));

vi.mock("@/components/ki-help/KiHelpFaqSheet", () => ({
  KiHelpFaqSheet: () => <button type="button">KI erklären</button>,
}));

vi.mock("@/components/ki-help/AiAssistanceLevelPicker", () => ({
  AiAssistanceLevelPicker: ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (value: "none" | "basic" | "everyday") => void;
  }) => (
    <div>
      <button type="button" aria-pressed={value === "none"} onClick={() => onChange("none")}>
        Ohne KI
      </button>
    </div>
  ),
}));

vi.mock("@/lib/ki-help/ai-assistance-levels", () => ({
  levelToConsentChoice: (level: string) => (level === "none" ? "no" : "yes"),
}));

function baseState(): RegisterFormState {
  return {
    email: "comfort@example.invalid",
    displayName: "",
    firstName: "Conny",
    lastName: "Comfort",
    dateOfBirth: "1964-05-17",
    inviteCode: "BAD-1234",
    householdId: "household-1",
    referrerId: null,
    verificationMethod: "invite_code",
    selectedAddress: null,
    houseNumber: "12",
    postalCode: "79713",
    city: "Bad Säckingen",
    geoQuarter: {
      quarter_id: "quarter-1",
      quarter_name: "Bad Säckingen",
      action: "join",
    },
    pilotRole: "resident",
    uiMode: "comfort",
    aiConsentChoice: "later",
    aiAssistanceLevel: "none",
    loading: false,
    geoLoading: false,
    error: null,
  };
}

describe("RegisterStepAiConsent uiMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOtp.mockResolvedValue({ error: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );
  });

  it("submits selected comfort uiMode instead of hard-coded active", async () => {
    const setState = vi.fn();
    const setStep = vi.fn();

    render(
      <RegisterStepAiConsent
        state={baseState()}
        setState={setState}
        setStep={setStep}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ohne KI/i }));
    fireEvent.click(screen.getByRole("button", { name: /Registrierung abschließen|Weiter/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/register/complete",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"uiMode":"comfort"'),
        }),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run "app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx"
```

Expected: FAIL because the component sends `uiMode: "active"`.

- [ ] **Step 3: Wire step in main register page**

Modify imports in `app/(auth)/register/page.tsx`:

```ts
  RegisterStepUiMode,
```

Change preview steps:

```ts
const LOCAL_PREVIEW_STEPS: Step[] = ["identity", "pilot_role", "ui_mode", "ai_consent"];
```

Add default mode to initial state:

```ts
    uiMode: undefined,
```

Add local preview default:

```ts
    uiMode: "comfort",
```

Change progress:

```ts
  const totalSteps = 5;
  const currentStep = (() => {
    if (step === "entry" || step === "invite_code" || step === "address") return 1;
    if (step === "identity") return 2;
    if (step === "pilot_role") return 3;
    if (step === "ui_mode") return 4;
    if (step === "ai_consent") return 5;
    return 5;
  })();
```

Render new step:

```tsx
        {step === "ui_mode" && (
          <RegisterStepUiMode state={formState} setState={updateState} setStep={setStep} />
        )}
```

Change OTP back:

```tsx
            onBack={() => { setStep("ai_consent"); updateState({ error: null }); }}
```

Keep this as-is unless product wants back to `ui_mode` from OTP. The AI consent screen itself will go back to `ui_mode`.

- [ ] **Step 4: Change pilot role continue target**

In `app/(auth)/register/components/RegisterStepPilotRole.tsx`, change:

```ts
    setStep("ai_consent");
```

to:

```ts
    setStep("ui_mode");
```

- [ ] **Step 5: Submit selected UI mode and fix AI back target**

In `app/(auth)/register/components/RegisterStepAiConsent.tsx`, change request body:

```ts
          uiMode: state.uiMode ?? "active",
```

Change the back button at the bottom from:

```ts
          setStep("pilot_role");
```

to:

```ts
          setStep("ui_mode");
```

- [ ] **Step 6: Wire preview route**

In `app/(auth)/register/preview/[step]/page.tsx`, add:

```ts
  "ui-mode": "ui_mode",
```

In `app/(auth)/register/preview/RegisterPreviewForm.tsx`:

Add import:

```ts
  RegisterStepUiMode,
```

Set `totalSteps` to `5`.

Add progress mapping:

```ts
    if (step === "ui_mode") return 4;
    if (step === "ai_consent") return 5;
```

Render:

```tsx
        {step === "ui_mode" && (
          <RegisterStepUiMode state={formState} setState={updateState} setStep={setStep} />
        )}
```

- [ ] **Step 7: Run targeted tests**

Run:

```powershell
npx vitest run "app/(auth)/register/components/RegisterStepUiMode.test.tsx" "app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx" --testTimeout=20000
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add "app/(auth)/register/page.tsx" "app/(auth)/register/preview/[step]/page.tsx" "app/(auth)/register/preview/RegisterPreviewForm.tsx" "app/(auth)/register/components/RegisterStepPilotRole.tsx" "app/(auth)/register/components/RegisterStepAiConsent.tsx" "app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx"
git commit -m "feat(registration): persist selected ui mode"
```

---

### Task 4: Make Dashboard Active vs Aktiv 55+ Feel Different

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Create or modify: `__tests__/app/dashboard-ui-mode.test.tsx`

- [ ] **Step 1: Write failing dashboard behavior tests**

Create `__tests__/app/dashboard-ui-mode.test.tsx` if no suitable dashboard test exists. Mock the hook and dependencies to isolate the mode-aware quick action.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/(app)/dashboard/page";
import type { UserUiMode } from "@/lib/user-modes";

let mockedUiMode: UserUiMode = "active";
let mockedDashboardDensity: "standard" | "calm" | "simple" = "standard";

vi.mock("@/app/(app)/dashboard/hooks/useDashboardData", () => ({
  getGreeting: () => ({ text: "Guten Tag", timeKey: "afternoon" }),
  useDashboardData: () => ({
    alerts: [],
    news: [],
    helpRequests: [],
    marketplaceItems: [],
    userName: "Test",
    uiMode: mockedUiMode,
    dashboardDensity: mockedDashboardDensity,
    reputationLevel: 0,
    loading: false,
    profileData: null,
    weatherData: null,
    caregivers: [],
    unreadCount: 0,
    currentQuarter: {
      id: "quarter-1",
      name: "Purkersdorfer/Sanary/Rebberg",
      city: "Bad Säckingen",
      center_lat: null,
      center_lng: null,
      zoom_level: 16,
      map_config: null,
    },
    quarterLoading: false,
    showInviteModal: false,
    setShowInviteModal: vi.fn(),
    loadDashboard: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/useMapStatuses", () => ({
  useMapStatuses: () => ({ geoHouses: [], residentCounts: {}, statuses: {} }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          is: () => ({
            limit: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/components/dashboard/DiscoverGrid", () => ({
  DiscoverGrid: () => <div data-testid="discover-grid" />,
}));

vi.mock("@/components/PullToRefresh", () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/modules/care/components/checkin/DailyCheckinBubble", () => ({
  DailyCheckinBubble: () => null,
}));

vi.mock("@/components/brand/BrandFooter", () => ({
  BrandFooter: () => null,
}));

vi.mock("@/components/FloatingHelpButton", () => ({
  FloatingHelpButton: () => null,
}));

describe("Dashboard ui modes", () => {
  it("shows Gemeinschaft first for active users", () => {
    mockedUiMode = "active";
    mockedDashboardDensity = "standard";

    render(<DashboardPage />);

    expect(screen.getByText("Aktivmodus")).toBeInTheDocument();
    expect(screen.getByText("Gemeinschaft")).toBeInTheDocument();
    expect(screen.queryByText("Mein Tag")).not.toBeInTheDocument();
  });

  it("shows Mein Tag first for Aktiv 55+ comfort users", () => {
    mockedUiMode = "comfort";
    mockedDashboardDensity = "calm";

    render(<DashboardPage />);

    expect(screen.getByText("Aktiv 55+")).toBeInTheDocument();
    expect(screen.getByText("Mein Tag")).toBeInTheDocument();
    expect(screen.getByText("Ruhiger Überblick für aktive Nachbarn")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run "__tests__/app/dashboard-ui-mode.test.tsx" --testTimeout=20000
```

Expected: FAIL because comfort currently still uses the non-senior first tile `Gemeinschaft`.

- [ ] **Step 3: Change first dashboard quick action**

In `app/(app)/dashboard/page.tsx`, replace:

```ts
  const showSeniorCheckinQuickAction = uiMode === "senior";
```

with:

```ts
  const showSeniorCheckinQuickAction = uiMode === "senior";
  const showComfortDayQuickAction = uiMode === "comfort";
```

Replace the first quick-action conditional block with a three-way branch:

```tsx
              {showSeniorCheckinQuickAction ? (
                <Link
                  href="/care/checkin"
                  className={`glass-tile flex flex-col justify-center p-4 ${
                    isComfortDashboard ? "min-h-[92px]" : "min-h-[80px]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-quartier-green" />
                    <span className="font-semibold text-anthrazit">
                      Check-in
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Wie geht es Ihnen?
                  </p>
                </Link>
              ) : showComfortDayQuickAction ? (
                <Link
                  href="/my-day"
                  className="glass-tile flex min-h-[92px] flex-col justify-center p-4"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-quartier-green" />
                    <span className="font-semibold text-anthrazit">
                      Mein Tag
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Termine, Hinweise, Alltag
                  </p>
                </Link>
              ) : (
                <Link
                  href="/gruppen"
                  className={`glass-tile flex flex-col justify-center p-4 ${
                    isComfortDashboard ? "min-h-[92px]" : "min-h-[80px]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5 text-quartier-green" />
                    <span className="font-semibold text-anthrazit">
                      Gemeinschaft
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gruppen & Nachbarn
                  </p>
                </Link>
              )}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npx vitest run "__tests__/app/dashboard-ui-mode.test.tsx" --testTimeout=20000
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add "app/(app)/dashboard/page.tsx" "__tests__/app/dashboard-ui-mode.test.tsx"
git commit -m "feat(dashboard): tailor comfort mode for active 55"
```

---

### Task 5: Update Profile and Help Copy

**Files:**
- Modify: `lib/help-content.ts`
- Optional Modify: `components/modes/UserModeSurface.tsx`
- Existing tests: `lib/__tests__/user-modes.test.ts`

- [ ] **Step 1: Add help-content test if none exists**

Create `lib/__tests__/help-content-ui-modes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { helpCategories } from "@/lib/help-content";

describe("help content ui modes", () => {
  it("explains Aktiv 55+ separately from Einfach", () => {
    const flat = helpCategories
      .flatMap((category) => category.items)
      .map((item) => `${item.question} ${item.answer}`)
      .join("\n");

    expect(flat).toContain("Aktiv 55+");
    expect(flat).toContain("Einfach");
    expect(flat).toContain("Profil");
  });
});
```

If `help-content.ts` exports a different symbol, inspect the export and adapt the import to the actual exported name.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run lib/__tests__/help-content-ui-modes.test.ts
```

Expected: FAIL because help text still mentions only `Seniorenmodus`.

- [ ] **Step 3: Update help copy**

In `lib/help-content.ts`, replace the old answer for "Kann ich den Seniorenmodus aktivieren?" with:

```ts
answer:
  "Ja. Unter Profil können Sie zwischen Aktiv, Aktiv 55+ und Einfach wechseln. Aktiv 55+ ist ruhiger und größer, bleibt aber eine normale Nachbarschafts-App. Einfach nutzt sehr große Schaltflächen, kurze Wege und Notruf zuerst.",
```

- [ ] **Step 4: Run tests**

Run:

```bash
npx vitest run lib/__tests__/user-modes.test.ts lib/__tests__/help-content-ui-modes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/help-content.ts lib/__tests__/help-content-ui-modes.test.ts
git commit -m "docs(help): explain active 55 ui mode"
```

---

### Task 6: Final Verification and Handoff

**Files:**
- Create: `docs/plans/2026-05-17-active-55-comfort-mode-handover.md`

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npx vitest run "lib/__tests__/user-modes.test.ts" "app/(auth)/register/components/RegisterStepUiMode.test.tsx" "app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx" "__tests__/app/dashboard-ui-mode.test.tsx" "lib/__tests__/help-content-ui-modes.test.ts" --testTimeout=20000
```

Expected: PASS.

- [ ] **Step 2: Run project checks**

Run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected:

- TypeScript passes.
- ESLint passes.
- Next build completes. Local Stripe disabled warnings are acceptable if the build exits `0`.

- [ ] **Step 3: Create handoff**

Create `docs/plans/2026-05-17-active-55-comfort-mode-handover.md`:

```md
# Active 55 Comfort Mode Handover

Date: 2026-05-17

## Summary

The existing `comfort` UI mode is now the user-facing `Aktiv 55+` mode. It is selectable during registration, persists to `users.ui_mode`, can still be changed from profile, and has a distinct dashboard first action.

## Product Decision

- No new DB role or `ui_mode` value was added.
- Persisted value remains `comfort`.
- User-facing label is `Aktiv 55+`.
- `senior` remains the simplified safety-first mode.

## Changed Files

- `lib/user-modes.ts`
- `lib/__tests__/user-modes.test.ts`
- `app/(auth)/register/components/types.ts`
- `app/(auth)/register/components/RegisterStepUiMode.tsx`
- `app/(auth)/register/components/RegisterStepUiMode.test.tsx`
- `app/(auth)/register/components/index.ts`
- `app/(auth)/register/page.tsx`
- `app/(auth)/register/preview/[step]/page.tsx`
- `app/(auth)/register/preview/RegisterPreviewForm.tsx`
- `app/(auth)/register/components/RegisterStepPilotRole.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.tsx`
- `app/(auth)/register/components/RegisterStepAiConsent.ui-mode.test.tsx`
- `app/(app)/dashboard/page.tsx`
- `__tests__/app/dashboard-ui-mode.test.tsx`
- `lib/help-content.ts`
- `lib/__tests__/help-content-ui-modes.test.ts`

## Verification

- Targeted Vitest: PASS
- `npx tsc --noEmit`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS

## Deployment

Not pushed or deployed unless Founder explicitly approved push/deploy after this handoff.
```

- [ ] **Step 4: Commit**

```bash
git add docs/plans/2026-05-17-active-55-comfort-mode-handover.md
git commit -m "docs(handoff): record active 55 comfort mode"
```

- [ ] **Step 5: Report status**

Report in German:

```text
Aktiv 55+ ist lokal umgesetzt und getestet. Persistierter DB-Wert bleibt comfort, kein neues Schema. Registrierung, Profilwechsel und Dashboard unterscheiden active/comfort/senior jetzt sichtbar. Nicht gepusht/deployed.
```

---

## Self-Review

Spec coverage:

- Existing infrastructure checked and reused: covered in Existing Context and Task 1.
- No duplicate role: covered by keeping `comfort` and tests rejecting `active_55`.
- Registration selection: covered by Tasks 2 and 3.
- Dashboard difference: covered by Task 4.
- Profile/help discoverability: covered by Task 5.
- New-session execution: covered by this saved plan and required sub-skill header.

Placeholder scan:

- This plan contains concrete file paths, commands, expected outcomes, and code snippets for all implementation tasks.

Type consistency:

- Persisted mode uses existing `UserUiMode` value `"comfort"`.
- Registration state uses `uiMode?: UserUiMode`.
- New step value is `"ui_mode"` and navigation goes `pilot_role -> ui_mode -> ai_consent`.
