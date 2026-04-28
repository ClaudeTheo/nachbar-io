import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/(auth)/register/page";
import { RegisterPreviewForm } from "@/app/(auth)/register/preview/RegisterPreviewForm";

const searchParamsMock = vi.hoisted(() => ({
  value: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock.value,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(),
    },
  }),
}));

describe("RegisterPage local preview steps", () => {
  afterEach(() => {
    searchParamsMock.value = new URLSearchParams();
    window.history.pushState({}, "", "/");
    cleanup();
  });

  it("opens the identity step directly for local preview", async () => {
    searchParamsMock.value = new URLSearchParams("previewStep=identity");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 2 von 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
    expect(screen.getByLabelText("E-Mail-Adresse")).toHaveValue("test.person@example.invalid");
  });

  it("opens the pilot-role step directly for local preview", async () => {
    searchParamsMock.value = new URLSearchParams("previewStep=pilot_role");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 3 von 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich teste nur/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens the KI-consent step directly for local preview without sending data", async () => {
    searchParamsMock.value = new URLSearchParams("previewStep=ai_consent");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 4 von 4")).toBeInTheDocument();
    expect(screen.getByText("Möchten Sie Unterstützung durch die KI-Hilfe?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Auswahl speichern und Link senden/i })).toBeDisabled();
  });

  it("uses the browser URL as fallback when Next search params are stale", async () => {
    searchParamsMock.value = new URLSearchParams();
    window.history.pushState({}, "", "/register?previewStep=identity");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 2 von 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
  });

  it("renders the browser URL preview step on first paint", () => {
    searchParamsMock.value = new URLSearchParams();
    window.history.pushState({}, "", "/register?previewStep=identity");

    render(<RegisterPage />);

    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
  });

  it("offers local preview links for the next onboarding steps", () => {
    render(<RegisterPage />);

    expect(screen.getByRole("link", { name: "Vorschau Schritt 2" })).toHaveAttribute(
      "href",
      "/register/preview/identity",
    );
    expect(screen.getByRole("link", { name: "Vorschau Schritt 3" })).toHaveAttribute(
      "href",
      "/register/preview/pilot-role",
    );
    expect(screen.getByRole("link", { name: "Vorschau Schritt 4" })).toHaveAttribute(
      "href",
      "/register/preview/ai-consent",
    );
  });

  it("renders the preview form directly for dedicated local preview routes", () => {
    render(<RegisterPreviewForm initialStep="pilot_role" />);

    expect(screen.getByText("Schritt 3 von 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich teste nur/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("link", { name: "Vorschau Schritt 4" })).toHaveAttribute(
      "href",
      "/register/preview/ai-consent",
    );
  });
});
