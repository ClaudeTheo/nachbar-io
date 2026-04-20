import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import EinladungLandingPage from "@/app/einladung/[token]/page";

describe("EinladungLandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("zeigt expectedOrgName und Anmelden + Account-anlegen", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        expectedOrgName: "Hausverwaltung Mueller GmbH",
        expiresAt: "2026-05-20T00:00:00Z",
      }),
    });

    render(
      <EinladungLandingPage params={Promise.resolve({ token: "tok-abc" })} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Hausverwaltung Mueller GmbH/)).toBeTruthy();
    });
    expect(screen.getByRole("link", { name: /Anmelden/i })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Account anlegen|Registrieren/i }),
    ).toBeTruthy();
  });

  it("zeigt Fehler bei unbekanntem Token", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "invitation_not_found" }),
    });

    render(
      <EinladungLandingPage params={Promise.resolve({ token: "unknown" })} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Einladung ungueltig oder abgelaufen."),
      ).toBeTruthy();
    });
  });

  it("zeigt auch bei technischem API-Fehler nur generischen Text", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error:
          "Could not find the table 'public.housing_invitations' in the schema cache",
      }),
    });

    render(
      <EinladungLandingPage params={Promise.resolve({ token: "unknown" })} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Einladung ungueltig oder abgelaufen."),
      ).toBeTruthy();
    });
  });
});
