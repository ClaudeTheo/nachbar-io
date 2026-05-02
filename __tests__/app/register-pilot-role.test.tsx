import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterStepPilotRole } from "@/app/(auth)/register/components/RegisterStepPilotRole";
import type { RegisterFormState, Step } from "@/app/(auth)/register/components/types";

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

function StatefulPilotRoleStep({
  initialState = buildState(),
  onStep = vi.fn(),
}: {
  initialState?: RegisterFormState;
  onStep?: (step: Step) => void;
}) {
  const [state, setLocalState] = useState(initialState);

  return (
    <RegisterStepPilotRole
      state={state}
      setState={(updates) => setLocalState((current) => ({ ...current, ...updates }))}
      setStep={onStep}
    />
  );
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

    expect(
      screen.getByText("Wie nutzen Sie die QuartierApp im Pilot?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Menschen im Quartier aufeinander achten/i)).toBeInTheDocument();
    expect(screen.getByText(/Sie können diese Auswahl später ändern/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rollen und Pilot erklären" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich nutze die App für mich/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich unterstütze jemanden/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich helfe im Quartier/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich probiere nur testweise/i })).toBeInTheDocument();
    expect(screen.queryByText(/fuer|unterstuetze|Angehoerige|Zurueck/i)).not.toBeInTheDocument();
  });

  it("markiert die gewaehlte Rolle und geht bewusst danach zur KI-Auswahl", async () => {
    const setStep = vi.fn();
    const user = userEvent.setup();

    render(<StatefulPilotRoleStep onStep={setStep} />);

    await user.click(screen.getByRole("button", { name: /Ich unterstütze jemanden/i }));

    expect(screen.getByRole("button", { name: /Ich unterstütze jemanden/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(setStep).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Weiter zur KI-Auswahl" }));

    expect(setStep).toHaveBeenCalledWith("ai_consent");
  });

  it("erklaert Testkonten vor dem Weitergehen", async () => {
    const user = userEvent.setup();

    render(<StatefulPilotRoleStep />);

    await user.click(screen.getByRole("button", { name: /Ich probiere nur testweise/i }));

    expect(screen.getAllByText(/nicht als echte Pilot-Nutzung/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/interne Tests und Demos/i).length).toBeGreaterThan(0);
  });

  it("zeigt ausfuehrliche Infos zu Rollen, Testkonten und KI", async () => {
    const user = userEvent.setup();

    render(<StatefulPilotRoleStep />);

    await user.click(screen.getByRole("button", { name: "Rollen und Pilot erklären" }));

    expect(screen.getByText("Warum fragen wir nach Ihrer Rolle?")).toBeInTheDocument();
    expect(screen.getByText("Was bedeuten die Rollen?")).toBeInTheDocument();
    expect(screen.getByText("Was passiert mit Testkonten?")).toBeInTheDocument();
    expect(screen.getByText("Was ist mit KI?")).toBeInTheDocument();
  });
});
