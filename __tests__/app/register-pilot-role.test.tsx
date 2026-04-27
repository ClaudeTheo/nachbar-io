import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepPilotRole } from "@/app/(auth)/register/components/RegisterStepPilotRole";
import type { RegisterFormState } from "@/app/(auth)/register/components/types";

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

describe("RegisterStepPilotRole", () => {
  afterEach(() => cleanup());

  it("fragt die Pilot-Rolle in einfachen Worten ab", () => {
    render(
      <RegisterStepPilotRole
        state={buildState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    expect(screen.getByText("Wie nutzen Sie Nachbar.io im Pilot?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich nutze die App fuer mich/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich unterstuetze jemanden/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich helfe im Quartier/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich teste nur/i })).toBeInTheDocument();
  });

  it("speichert die Rolle und geht danach zur KI-Auswahl", async () => {
    const setState = vi.fn();
    const setStep = vi.fn();
    const user = userEvent.setup();

    render(
      <RegisterStepPilotRole
        state={buildState()}
        setState={setState}
        setStep={setStep}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Ich unterstuetze jemanden/i }));

    expect(setState).toHaveBeenCalledWith({ pilotRole: "caregiver", error: null });
    expect(setStep).toHaveBeenCalledWith("ai_consent");
  });
});
