import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/components/BugReportButton", () => ({
  BugReportButton: () => null,
}));

vi.mock("@/lib/auth/apple", () => ({
  signInWithApple: vi.fn(),
}));

vi.mock("@/lib/auth/passkey-login", () => ({
  handlePasskeyLogin: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  })),
}));

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(() => false),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("versteckt Passwort-Login im Pilotbetrieb", async () => {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");

    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /anmelde-code senden/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/stattdessen mit passwort anmelden/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/passwort/i)).not.toBeInTheDocument();
  });
});
