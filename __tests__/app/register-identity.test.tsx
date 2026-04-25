import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepIdentity } from "@/app/(auth)/register/components/RegisterStepIdentity";
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
    houseNumber: "12",
    postalCode: "79713",
    city: "Bad Säckingen",
    geoQuarter: { quarter_id: "quarter-bs", quarter_name: "Bad Säckingen", action: "matched" },
    loading: false,
    geoLoading: false,
    error: null,
  };
}

describe("RegisterStepIdentity", () => {
  afterEach(() => cleanup());

  it("fragt im Pilot Vorname, Nachname und Geburtsdatum mit einfachem Zweckhinweis ab", () => {
    render(
      <RegisterStepIdentity
        state={buildState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Vorname")).toBeInTheDocument();
    expect(screen.getByLabelText("Nachname")).toBeInTheDocument();
    expect(screen.getByLabelText("Geburtsdatum")).toBeInTheDocument();
    expect(screen.getByText(/Vertrauen, Sicherheit und Pilot-Zuordnung/i)).toBeInTheDocument();
    expect(screen.queryByText(/Klarname ist nicht erforderlich/i)).not.toBeInTheDocument();
  });
});
