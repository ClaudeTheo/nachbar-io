import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/(auth)/register/page";
import { RegisterPreviewForm } from "@/app/(auth)/register/preview/RegisterPreviewForm";
import RegisterLocalPreviewPage from "@/app/(auth)/register/preview/[step]/page";

const navigationMock = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  searchParams: {
    value: new URLSearchParams(),
  },
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMock.notFound,
  useSearchParams: () => navigationMock.searchParams.value,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: vi.fn(),
    },
  }),
}));

describe("Register local preview (dedicated route)", () => {
  afterEach(() => {
    navigationMock.searchParams.value = new URLSearchParams();
    navigationMock.notFound.mockClear();
    vi.unstubAllEnvs();
    window.history.pushState({}, "", "/");
    cleanup();
  });

  // Regressions-Guard: der alte ?previewStep=-Mechanismus wurde entfernt —
  // der Parameter darf den normalen Register-Flow nicht mehr beeinflussen.
  it("ignores the removed previewStep query param and shows the entry step", async () => {
    navigationMock.searchParams.value = new URLSearchParams("previewStep=identity");
    window.history.pushState({}, "", "/register?previewStep=identity");

    render(<RegisterPage />);

    expect(await screen.findByText("Wie möchten Sie beitreten?")).toBeInTheDocument();
    expect(screen.queryByLabelText("Vorname")).not.toBeInTheDocument();
  });

  it("throws 404 for the preview route in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      RegisterLocalPreviewPage({
        params: Promise.resolve({ step: "ai-consent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigationMock.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the preview form for the identity step without internal links", () => {
    render(<RegisterPreviewForm initialStep="identity" />);

    expect(screen.getByText("Schritt 2 von 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
    expect(screen.queryByRole("link", { name: /Vorschau Schritt/i })).not.toBeInTheDocument();
  });

  it("renders the ui-mode preview step", () => {
    render(<RegisterPreviewForm initialStep="ui_mode" />);

    expect(screen.getByText("Schritt 3 von 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aktiv 55\+:/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("blocks Link senden in the KI-consent preview", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(<RegisterPreviewForm initialStep="ai_consent" />);

    await user.click(screen.getByRole("button", { name: /^Aus\s/i }));
    await user.click(
      screen.getByRole("button", {
        name: /Auswahl speichern und Link senden/i,
      }),
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Vorschau: Es wird kein Link gesendet/i),
    ).toBeInTheDocument();
  });
});
