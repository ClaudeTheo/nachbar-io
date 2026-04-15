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
