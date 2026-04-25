import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepEntry } from "@/app/(auth)/register/components/RegisterStepEntry";
import type { RegisterFormState } from "@/app/(auth)/register/components/types";

function buildState(): RegisterFormState {
  return {
    email: "",
    displayName: "",
    inviteCode: "",
    householdId: null,
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

describe("RegisterStepEntry", () => {
  afterEach(() => cleanup());

  it("macht den geschlossenen Pilot und den empfohlenen Einladungscode-Pfad klar", () => {
    render(
      <RegisterStepEntry
        state={buildState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    expect(screen.getByText(/geschlossener test/i)).toBeInTheDocument();
    expect(screen.getByText(/bad s[aä]ckingen/i)).toBeInTheDocument();
    expect(screen.getAllByText(/einladungscode/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/nur das n[oö]tige/i)).toBeInTheDocument();
  });
});
