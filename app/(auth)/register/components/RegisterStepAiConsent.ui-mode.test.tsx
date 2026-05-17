import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  KiHelpFaqSheet: () => <button type="button">KI erklaeren</button>,
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
      <button
        type="button"
        aria-pressed={value === "none"}
        onClick={() => onChange("none")}
      >
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
    city: "Bad Saeckingen",
    geoQuarter: {
      quarter_id: "quarter-1",
      quarter_name: "Bad Saeckingen",
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

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
    fireEvent.click(
      screen.getByRole("button", { name: /Auswahl speichern und Link senden/i }),
    );

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
