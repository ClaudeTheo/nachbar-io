import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignInWithOtp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockRouterPush = vi.fn();
let nextParam: string | null = null;

vi.mock("@/components/BugReportButton", () => ({
  BugReportButton: () => null,
}));

vi.mock("@/components/auth/OtpCodeEntry", () => ({
  OtpCodeEntry: ({
    email,
    redirectTo,
  }: {
    email: string;
    redirectTo?: string;
  }) => (
    <div>
      <div>{email}</div>
      <div data-testid="otp-redirect">{redirectTo}</div>
    </div>
  ),
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
      signInWithOtp: mockSignInWithOtp,
      signInWithPassword: mockSignInWithPassword,
      verifyOtp: vi.fn(),
    },
  })),
}));

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(() => false),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === "next" ? nextParam : null),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockSignInWithPassword.mockResolvedValue({ error: null });
    nextParam = null;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

  it("wechselt nach OTP-Versand in die Code-Eingabe ohne Enumeration-UI", async () => {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/e-mail-adresse/i), {
      target: { value: "ghost@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /anmelde-code senden/i }),
    );

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/code eingeben/i)).toBeInTheDocument();
    expect(screen.getByText("ghost@example.com")).toBeInTheDocument();
    expect(
      screen.queryByText(/nicht registriert|unbekannt|existiert nicht/i),
    ).not.toBeInTheDocument();
  });

  it("reicht next an den OTP-Login-Flow weiter", async () => {
    nextParam = "/hausverwaltung/einladen?foo=bar";
    const { default: LoginPage } = await import("@/app/(auth)/login/page");

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/e-mail-adresse/i), {
      target: { value: "ghost@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /anmelde-code senden/i }),
    );

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: "ghost@example.com",
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fhausverwaltung%2Feinladen%3Ffoo%3Dbar`,
        },
      });
    });

    expect(screen.getByTestId("otp-redirect")).toHaveTextContent(
      "/hausverwaltung/einladen?foo=bar",
    );
  });
});
