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
    expect(screen.getByRole("link", { name: /Zur Anmeldung/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
