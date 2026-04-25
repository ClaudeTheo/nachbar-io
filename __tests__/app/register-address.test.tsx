import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepAddress } from "@/app/(auth)/register/components/RegisterStepAddress";
import type { RegisterFormState } from "@/app/(auth)/register/components/types";

function buildState(): RegisterFormState {
  return {
    email: "",
    displayName: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    inviteCode: "",
    householdId: null,
    referrerId: null,
    verificationMethod: "address_manual",
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

describe("RegisterStepAddress", () => {
  afterEach(() => cleanup());

  it("erklaert die Pflichtadresse und behandelt Standort nur als Quartier-Pruefung", () => {
    render(
      <RegisterStepAddress
        state={buildState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    expect(screen.getByText(/Adresse ist im Pilot Pflicht/i)).toBeInTheDocument();
    expect(screen.getByText(/richtigen Quartier und Haushalt/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Standort zur Quartier-Prüfung nutzen/i })).toBeInTheDocument();
  });
});
