import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
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

describe("RegisterPage local preview steps", () => {
  afterEach(() => {
    navigationMock.searchParams.value = new URLSearchParams();
    navigationMock.notFound.mockClear();
    vi.unstubAllEnvs();
    window.history.pushState({}, "", "/");
    cleanup();
  });

  it("opens the identity step directly for local preview", async () => {
    navigationMock.searchParams.value = new URLSearchParams("previewStep=identity");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 2 von 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
    expect(screen.getByLabelText("E-Mail-Adresse")).toHaveValue("test.person@example.invalid");
  });

  it("opens the pilot-role step directly for local preview", async () => {
    navigationMock.searchParams.value = new URLSearchParams("previewStep=pilot_role");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 3 von 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich probiere nur testweise/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens the KI-consent step directly for local preview without sending data", async () => {
    navigationMock.searchParams.value = new URLSearchParams("previewStep=ai_consent");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 4 von 4")).toBeInTheDocument();
    expect(screen.getByText("Möchten Sie Unterstützung durch die KI-Hilfe?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Auswahl speichern und Link senden/i })).toBeDisabled();
  });

  it("blocks Link senden in the query-param KI-consent preview", async () => {
    const user = userEvent.setup();
    navigationMock.searchParams.value = new URLSearchParams("previewStep=ai_consent");
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 4 von 4")).toBeInTheDocument();
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

  it("uses the browser URL as fallback when Next search params are stale", async () => {
    navigationMock.searchParams.value = new URLSearchParams();
    window.history.pushState({}, "", "/register?previewStep=identity");

    render(<RegisterPage />);

    expect(await screen.findByText("Schritt 2 von 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
  });

  it("renders the browser URL preview step on first paint", () => {
    navigationMock.searchParams.value = new URLSearchParams();
    window.history.pushState({}, "", "/register?previewStep=identity");

    render(<RegisterPage />);

    expect(screen.getByLabelText("Vorname")).toHaveValue("Test");
  });

  it("keeps local preview links out of the server HTML", () => {
    const html = renderToString(<RegisterPage />);

    expect(html).not.toContain("Vorschau Schritt");
  });

  it("does not show internal preview links on the visible register page", () => {
    render(<RegisterPage />);

    expect(screen.queryByRole("link", { name: /Vorschau Schritt/i })).not.toBeInTheDocument();
  });

  it("ignores the query-param preview path in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    navigationMock.searchParams.value = new URLSearchParams("previewStep=identity");
    window.history.pushState({}, "", "/register?previewStep=identity");

    render(<RegisterPage />);

    expect(await screen.findByText("Wie möchten Sie beitreten?")).toBeInTheDocument();
    expect(screen.queryByLabelText("Vorname")).not.toBeInTheDocument();
  });

  it("throws 404 for the dedicated preview route in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      RegisterLocalPreviewPage({
        params: Promise.resolve({ step: "ai-consent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigationMock.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders the preview form directly for dedicated local preview routes without internal links", () => {
    render(<RegisterPreviewForm initialStep="pilot_role" />);

    expect(screen.getByText("Schritt 3 von 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ich probiere nur testweise/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("link", { name: /Vorschau Schritt/i })).not.toBeInTheDocument();
  });

  it("blocks Link senden in the local KI-consent preview", async () => {
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
