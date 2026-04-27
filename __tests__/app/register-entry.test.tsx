import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepEntry } from "@/app/(auth)/register/components/RegisterStepEntry";
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
    expect(screen.getByText(/soziales pilotprojekt/i)).toBeInTheDocument();
    expect(screen.getByText(/füreinander da sein/i)).toBeInTheDocument();
    expect(screen.getAllByText(/einladungscode/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/nur das n[oö]tige/i)).toBeInTheDocument();
  });

  it("bietet eine ausfuehrliche Info-Erklaerung zum Pilot", async () => {
    const user = userEvent.setup();

    render(
      <RegisterStepEntry
        state={buildState()}
        setState={vi.fn()}
        setStep={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Was Sie wissen sollten" }));

    expect(screen.getByText("Warum gibt es Nachbar.io?")).toBeInTheDocument();
    expect(screen.getByText("Was passiert im Pilot?")).toBeInTheDocument();
    expect(screen.getByText("Welche Daten fragen wir ab?")).toBeInTheDocument();
  });
});
