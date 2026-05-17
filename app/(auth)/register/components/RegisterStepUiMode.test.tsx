import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RegisterStepUiMode } from "./RegisterStepUiMode";
import type { RegisterFormState, Step } from "./types";

afterEach(cleanup);

function baseState(
  overrides: Partial<RegisterFormState> = {},
): RegisterFormState {
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
    city: "Bad Saeckingen",
    geoQuarter: {
      quarter_id: "quarter-1",
      quarter_name: "Bad Saeckingen",
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
      error: "Bitte waehlen Sie aus, welche Oberflaeche Sie nutzen moechten.",
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
