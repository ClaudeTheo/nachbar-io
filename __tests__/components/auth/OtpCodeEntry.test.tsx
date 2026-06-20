import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OtpCodeEntry } from "@/components/auth/OtpCodeEntry";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      verifyOtp: vi.fn(),
    },
  })),
}));

describe("OtpCodeEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("deaktiviert erneutes Senden waehrend des Cooldowns und erlaubt es danach erneut", async () => {
    const onResend = vi.fn();

    render(
      <OtpCodeEntry
        email="pilot@example.com"
        onBack={vi.fn()}
        onResend={onResend}
      />,
    );

    const resendButton = screen.getByRole("button", {
      name: "Code erneut senden",
    });

    fireEvent.click(resendButton);

    expect(onResend).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /erneut senden \(\d+s\)/i }),
    ).toBeDisabled();

    for (let i = 0; i < 60; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000);
      });
    }

    const enabledButton = screen.getByRole("button", {
      name: "Code erneut senden",
    });
    expect(enabledButton).toBeEnabled();

    fireEvent.click(enabledButton);
    expect(onResend).toHaveBeenCalledTimes(2);
  });
});

// Befund B3:4: OTP-Eingabe barrierefrei — autoComplete fuer iOS/Android-Autofill,
// Fehler hoerbar via role=alert. Eigener Block ohne Fake-Timer (findByRole).
describe("OtpCodeEntry — Barrierefreiheit (B3:4)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("erstes Eingabefeld hat autoComplete='one-time-code'", () => {
    render(
      <OtpCodeEntry
        email="pilot@example.com"
        onBack={vi.fn()}
        onResend={vi.fn()}
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("zeigt den Fehler mit role='alert' bei ungueltigem Code", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ error: { message: "invalid" } }),
      },
    });

    render(
      <OtpCodeEntry
        email="pilot@example.com"
        onBack={vi.fn()}
        onResend={vi.fn()}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    for (let i = 0; i < 6; i += 1) {
      fireEvent.change(inputs[i], { target: { value: String(i) } });
    }

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ungueltig|ungültig|abgelaufen/i,
    );
  });
});
