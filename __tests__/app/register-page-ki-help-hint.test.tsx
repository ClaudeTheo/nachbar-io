import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/(auth)/register/page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(),
    },
  }),
}));

describe("RegisterPage KI-Hilfe onboarding hint", () => {
  afterEach(() => cleanup());

  it("shows the first static KI-Hilfe orientation hint in the register shell", async () => {
    render(<RegisterPage />);
    expect(
      await screen.findByText(/Ich begleite Sie Schritt für Schritt/i),
    ).toBeInTheDocument();
  });
});
