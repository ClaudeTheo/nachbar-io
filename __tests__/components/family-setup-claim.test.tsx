import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetupClaimForm } from "@/modules/family-setup/components/SetupClaimForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SetupClaimForm", () => {
  beforeEach(() => {
    mockPush.mockReset();
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

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/jugend"));
  });
});
