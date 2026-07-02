import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetupClaimForm } from "@/modules/family-setup/components/SetupClaimForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInWithPassword = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
    },
  }),
}));

describe("SetupClaimForm", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (!init) {
        return {
          ok: true,
          json: async () => ({
            flowType: "child_direct",
            targetUiMode: "youth",
            expiresAt: "2099-05-15T10:00:00.000Z",
          }),
        } as Response;
      }
      expect(String(url)).toBe("/api/family-setup/raw-token");
      return {
        ok: true,
        json: async () => ({ userId: "child-user-1", redirectTo: "/jugend" }),
      } as Response;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads a safe preview and claims the setup token", async () => {
    render(<SetupClaimForm token="raw-token" />);

    expect(await screen.findByText(/Jugendzugang einrichten/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Anzeigename"), {
      target: { value: "Mia" },
    });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), {
      target: { value: "mia@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "SicheresPasswort123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Zugang aktivieren/i }));

    // Nach dem Claim wird direkt angemeldet (Befund A2:2) und dann geroutet
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/jugend"));
    expect(mockSignInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "mia@example.test" }),
    );
  });

  // --- A2:5 — Senior-Variante: ein Feld pro Schritt, 80px, Passwort-Toggle ---

  const seniorTestPasswort = "rosengarten am rhein 42";

  function mockSeniorFetch(capture?: { body?: unknown }) {
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (!init) {
        return {
          ok: true,
          json: async () => ({
            flowType: "senior_setup",
            targetUiMode: "senior",
            expiresAt: "2099-05-15T10:00:00.000Z",
          }),
        } as Response;
      }
      if (capture) capture.body = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({ userId: "senior-user-1", redirectTo: "/kreis-start" }),
      } as Response;
    });
  }

  describe("Senior-Variante (A2:5)", () => {
    it("zeigt Schritt 1 von 3 mit nur einem Feld (Anzeigename)", async () => {
      mockSeniorFetch();
      render(<SetupClaimForm token="raw-token" />);

      expect(await screen.findByText(/Senior-Zugang einrichten/i)).toBeInTheDocument();
      expect(screen.getByText(/Schritt 1 von 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ihr Name/i)).toBeInTheDocument();
      // Ein Feld pro Schritt: E-Mail und Passwort noch nicht sichtbar
      expect(screen.queryByLabelText(/E-Mail-Adresse/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^Passwort$/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Weiter/i })).toBeInTheDocument();
    });

    it("fuehrt durch alle drei Schritte und aktiviert den Zugang mit unveraendertem Payload", async () => {
      const capture: { body?: unknown } = {};
      mockSeniorFetch(capture);
      render(<SetupClaimForm token="raw-token" />);

      await screen.findByText(/Schritt 1 von 3/i);
      fireEvent.change(screen.getByLabelText(/Ihr Name/i), {
        target: { value: "Rosa Beispiel" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

      // Schritt 2: E-Mail + Alternative-Hinweis fuer Seniorinnen ohne eigene Adresse
      expect(screen.getByText(/Schritt 2 von 3/i)).toBeInTheDocument();
      expect(screen.getByText(/Keine eigene E-Mail-Adresse/i)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/i), {
        target: { value: "familie@example.test" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

      // Schritt 3: Passwort + aktivieren
      expect(screen.getByText(/Schritt 3 von 3/i)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/^Passwort$/i), {
        target: { value: seniorTestPasswort },
      });
      fireEvent.click(screen.getByRole("button", { name: /Zugang aktivieren/i }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/kreis-start"));
      expect(capture.body).toEqual({
        displayName: "Rosa Beispiel",
        email: "familie@example.test",
        password: seniorTestPasswort,
      });
    });

    it("Passwort-Umschalter macht die Eingabe sichtbar und wieder unsichtbar", async () => {
      mockSeniorFetch();
      render(<SetupClaimForm token="raw-token" />);

      await screen.findByText(/Schritt 1 von 3/i);
      fireEvent.change(screen.getByLabelText(/Ihr Name/i), {
        target: { value: "Rosa" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));
      fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/i), {
        target: { value: "familie@example.test" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

      const passwordInput = screen.getByLabelText(/^Passwort$/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      fireEvent.click(screen.getByRole("button", { name: /Passwort anzeigen/i }));
      expect(passwordInput).toHaveAttribute("type", "text");

      fireEvent.click(screen.getByRole("button", { name: /Passwort verbergen/i }));
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("Zurueck geht einen Schritt zurueck und behaelt die Eingabe", async () => {
      mockSeniorFetch();
      render(<SetupClaimForm token="raw-token" />);

      await screen.findByText(/Schritt 1 von 3/i);
      fireEvent.change(screen.getByLabelText(/Ihr Name/i), {
        target: { value: "Rosa Beispiel" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));
      expect(screen.getByText(/Schritt 2 von 3/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Zurück/i }));
      expect(screen.getByText(/Schritt 1 von 3/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ihr Name/i)).toHaveValue("Rosa Beispiel");
    });

    it("Eingaben und Buttons haben mindestens 80px Touch-Hoehe", async () => {
      mockSeniorFetch();
      render(<SetupClaimForm token="raw-token" />);

      await screen.findByText(/Schritt 1 von 3/i);
      expect(screen.getByLabelText(/Ihr Name/i)).toHaveStyle({ minHeight: "80px" });
      expect(screen.getByRole("button", { name: /Weiter/i })).toHaveStyle({
        minHeight: "80px",
      });
    });

    it("comfort-Modus bekommt ebenfalls die Senior-Variante", async () => {
      global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        if (!init) {
          return {
            ok: true,
            json: async () => ({
              flowType: "senior_setup",
              targetUiMode: "comfort",
              expiresAt: "2099-05-15T10:00:00.000Z",
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });
      render(<SetupClaimForm token="raw-token" />);

      expect(await screen.findByText(/Schritt 1 von 3/i)).toBeInTheDocument();
    });
  });

  it("zeigt bei fehlgeschlagener Auto-Anmeldung einen Hinweis statt still zu redirecten", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<SetupClaimForm token="raw-token" />);

    expect(await screen.findByText(/Jugendzugang einrichten/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Anzeigename"), {
      target: { value: "Mia" },
    });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), {
      target: { value: "mia@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "SicheresPasswort123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Zugang aktivieren/i }));

    expect(await screen.findByText(/Ihr Zugang ist bereit/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Zur Anmeldung/i }));
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
