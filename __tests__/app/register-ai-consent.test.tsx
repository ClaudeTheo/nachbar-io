import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterStepAiConsent } from "@/app/(auth)/register/components/RegisterStepAiConsent";
import type {
  RegisterFormState,
  Step,
} from "@/app/(auth)/register/components/types";

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

function StatefulAiConsent({
  initialState = buildState(),
  onStep = vi.fn(),
}: {
  initialState?: RegisterFormState;
  onStep?: (step: Step) => void;
}) {
  const [state, setLocalState] = useState(initialState);
  return (
    <RegisterStepAiConsent
      state={state}
      setState={(updates) =>
        setLocalState((current) => ({
          ...current,
          ...(typeof updates === "function" ? updates(current) : updates),
        }))
      }
      setStep={onStep}
    />
  );
}

describe("RegisterStepAiConsent — Polish 2026-04-27", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;
  });

  it("zeigt Title, Hero-Begruessung der QuartierApp und Kontroll-Botschaft", () => {
    render(<StatefulAiConsent />);
    expect(
      screen.getByText("Möchten Sie Unterstützung durch die KI-Hilfe?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Hallo, ich bin die KI-Hilfe der QuartierApp/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sie entscheiden selbst, ob und wann Sie mich nutzen/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Standardmäßig aus/i)).toBeInTheDocument();
  });

  it("zeigt eine klare DSGVO-Einwilligungsbox mit Freiwilligkeit und Widerruf", () => {
    render(<StatefulAiConsent />);

    expect(screen.getByText("Datenschutz und Einwilligung")).toBeInTheDocument();
    expect(screen.getByText(/freiwillig/i)).toBeInTheDocument();
    expect(screen.getByText(/jederzeit später widerrufen/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Datenschutzerklärung/i })).toHaveAttribute(
      "href",
      "/datenschutz",
    );
  });

  it("zeigt 4 wahlbare Stufen-Cards plus eine disabled Persoenlich-Card", () => {
    render(<StatefulAiConsent />);
    expect(screen.getByRole("button", { name: /^Aus\s/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Basis/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Alltag/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Später entscheiden/i }),
    ).toBeEnabled();
    const personal = screen.getByRole("button", { name: /Persönlich/i });
    expect(personal).toBeDisabled();
    expect(personal).toHaveAttribute("aria-disabled", "true");
  });

  it("markiert Auswahl visuell und submitted nicht automatisch", async () => {
    const user = userEvent.setup();
    const setStep = vi.fn();
    render(<StatefulAiConsent onStep={setStep} />);
    await user.click(screen.getByRole("button", { name: /^Basis/i }));

    expect(screen.getByRole("button", { name: /^Basis/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(setStep).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("Submit-Button ist disabled bis eine Auswahl getroffen wurde", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);
    const submit = screen.getByRole("button", {
      name: /Auswahl speichern und Link senden/i,
    });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^Aus\s/i }));
    expect(submit).toBeEnabled();
  });

  it("aktive KI-Stufen brauchen eine ausdrueckliche Einwilligung per Checkbox", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);

    const submit = screen.getByRole("button", {
      name: /Auswahl speichern und Link senden/i,
    });
    await user.click(screen.getByRole("button", { name: /^Alltag/i }));

    expect(submit).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /Ich willige freiwillig ein/i,
      }),
    );
    expect(submit).toBeEnabled();
  });

  it("Aus und Spaeter entscheiden brauchen keine KI-Einwilligungs-Checkbox", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);

    const submit = screen.getByRole("button", {
      name: /Auswahl speichern und Link senden/i,
    });
    await user.click(screen.getByRole("button", { name: /^Aus\s/i }));

    expect(screen.queryByRole("checkbox", { name: /Ich willige freiwillig ein/i })).toBeNull();
    expect(submit).toBeEnabled();
  });

  it("Klick auf disabled Persoenlich-Card aendert State nicht", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);
    const submit = screen.getByRole("button", {
      name: /Auswahl speichern und Link senden/i,
    });
    await user.click(screen.getByRole("button", { name: /Persönlich/i }));
    expect(submit).toBeDisabled();
  });

  it.each([
    ["Aus", "no", "off"],
    ["Basis", "yes", "basic"],
    ["Alltag", "yes", "everyday"],
    ["Später entscheiden", "later", "later"],
  ] as const)(
    "Submit mit %s sendet aiConsentChoice=%s und aiAssistanceLevel=%s",
    async (label, expectedChoice, expectedLevel) => {
      const user = userEvent.setup();
      render(<StatefulAiConsent />);

      const cardPattern =
        label === "Aus" ? /^Aus\s/i : new RegExp(`^${label}`, "i");
      await user.click(screen.getByRole("button", { name: cardPattern }));
      if (expectedChoice === "yes") {
        await user.click(
          screen.getByRole("checkbox", {
            name: /Ich willige freiwillig ein/i,
          }),
        );
      }
      await user.click(
        screen.getByRole("button", {
          name: /Auswahl speichern und Link senden/i,
        }),
      );

      const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
      const completeCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes("/api/register/complete"),
      );
      expect(completeCall).toBeDefined();
      const body = JSON.parse(String(completeCall![1].body));
      expect(body.aiConsentChoice).toBe(expectedChoice);
      expect(body.aiAssistanceLevel).toBe(expectedLevel);
    },
  );

  it("zeigt sichere Compliance-Footnote ohne AVV-Vorabversprechen", () => {
    render(<StatefulAiConsent />);
    // Sichere Variante (Codex-Review 2026-04-27): kein Pseudonymisierungs-/AVV-Versprechen vorab
    expect(
      screen.getByText(
        /Vor Ihrer Einwilligung wird nichts an eine KI gesendet/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Persönliche KI-Funktionen starten erst, wenn die nötigen Schutzmaßnahmen/i,
      ),
    ).toBeInTheDocument();
    // Altes Wording darf nicht mehr da sein
    expect(
      screen.queryByText(/pseudonymisiert, AVV beim Anbieter/i),
    ).not.toBeInTheDocument();
  });

  it("rendert den KI-Hilfe-Pulse-Dot als Button mit aria-label (FAQ-Trigger)", () => {
    render(<StatefulAiConsent />);
    const trigger = screen.getByRole("button", {
      name: /Hilfe zur KI-Hilfe öffnen/i,
    });
    expect(trigger).toBeInTheDocument();
  });

  it("Click auf Pulse-Dot oeffnet FAQ-Sheet mit Header", async () => {
    const user = userEvent.setup();
    render(<StatefulAiConsent />);
    await user.click(
      screen.getByRole("button", { name: /Hilfe zur KI-Hilfe öffnen/i }),
    );
    expect(
      await screen.findByText("Häufige Fragen zur KI-Hilfe"),
    ).toBeInTheDocument();
  });
});
