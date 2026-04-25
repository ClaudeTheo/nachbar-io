import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepAiConsent } from "@/app/(auth)/register/components/RegisterStepAiConsent";
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

describe("RegisterStepAiConsent", () => {
  afterEach(() => cleanup());

  it("offers Ja, Nein and Spaeter while keeping KI-Hilfe off by default", () => {
    render(
      <RegisterStepAiConsent
        state={buildState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    expect(screen.getByText("KI-Hilfe verwenden?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ja, aktivieren/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nein/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spaeter/i })).toBeInTheDocument();
    expect(screen.getByText(/standardmaessig ausgeschaltet/i)).toBeInTheDocument();
  });
});
