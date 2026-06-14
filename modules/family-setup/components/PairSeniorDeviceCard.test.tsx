// modules/family-setup/components/PairSeniorDeviceCard.test.tsx
// Nachbar.io — S2-7 (b): "Geraet verbinden" — UI-Bruecke zu POST /api/device/pair/start-code (Befund A2:3)
// Mini-Audit GRUEN: docs/plans/handoff/2026-06-14-s2-7-family-setup-mini-audit.md
// start-code ist caregiver_links-autorisiert; diese Komponente fuegt KEINE neue Auth-Flaeche hinzu.

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { PairSeniorDeviceCard } from "./PairSeniorDeviceCard";

const SENIOR_ID = "00000000-e2e0-4000-a001-000000000004";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("PairSeniorDeviceCard — Geraet verbinden (A2:3)", () => {
  it("zeigt einen Button zum Erzeugen des Verbindungs-Codes", () => {
    render(<PairSeniorDeviceCard seniorId={SENIOR_ID} seniorName="Gertrude" />);
    expect(
      screen.getByRole("button", { name: /code erzeugen/i }),
    ).toBeInTheDocument();
  });

  it("ruft start-code mit der senior_user_id und zeigt den 6-stelligen Code gross", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: "428913", expires_in: 600 }),
    } as Response);

    render(<PairSeniorDeviceCard seniorId={SENIOR_ID} seniorName="Gertrude" />);

    fireEvent.click(screen.getByRole("button", { name: /code erzeugen/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/device/pair/start-code",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ senior_user_id: SENIOR_ID }),
        }),
      );
    });

    expect(await screen.findByTestId("pair-code")).toHaveTextContent("428913");
  });

  it("zeigt eine verstaendliche Meldung, wenn der Pairing-Dienst nicht verfuegbar ist (503)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "Pairing-Service nicht verfuegbar (Redis)" }),
    } as Response);

    render(<PairSeniorDeviceCard seniorId={SENIOR_ID} seniorName="Gertrude" />);

    fireEvent.click(screen.getByRole("button", { name: /code erzeugen/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByTestId("pair-code")).not.toBeInTheDocument();
  });
});
