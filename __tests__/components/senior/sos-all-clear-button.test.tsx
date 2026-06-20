// __tests__/components/senior/sos-all-clear-button.test.tsx
// Welle S1 / Befund A3:4: Entwarnung am Senioren-Gerät. Der Senior kann einen
// selbst ausgelösten SOS-Alarm zurücknehmen ("Mir geht es wieder gut"), statt
// hilflos vor einem Eskalations-Countdown zu sitzen, den nur andere stoppen
// können. Nutzt die vorhandene cancelled-Transition (PATCH /api/care/sos/[id]).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SosAllClearButton } from "@/modules/care/components/senior/SosAllClearButton";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SosAllClearButton — SOS-Entwarnung (A3:4)", () => {
  it("zeigt den großen Entwarnungs-Button", () => {
    render(<SosAllClearButton alertId="alert-1" />);
    expect(
      screen.getByRole("button", { name: /mir geht es wieder gut/i }),
    ).toBeInTheDocument();
  });

  it("ruft PATCH /api/care/sos/[id] mit status 'cancelled'", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<SosAllClearButton alertId="alert-42" />);

    await userEvent.click(
      screen.getByRole("button", { name: /mir geht es wieder gut/i }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/care/sos/alert-42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "cancelled" });
  });

  it("zeigt nach Erfolg eine Bestätigung + Link zurück zur Startseite", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    render(<SosAllClearButton alertId="alert-1" />);

    await userEvent.click(
      screen.getByRole("button", { name: /mir geht es wieder gut/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/entwarnung gesendet/i)).toBeInTheDocument(),
    );
    const back = screen.getByRole("link", {
      name: /zur(ü|ue)ck zur startseite/i,
    });
    expect(back).toHaveAttribute("href", "/kreis-start");
  });

  it("zeigt bei Fehler eine verständliche Meldung in Senior-Sprache", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(<SosAllClearButton alertId="alert-1" />);

    await userEvent.click(
      screen.getByRole("button", { name: /mir geht es wieder gut/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/nicht geklappt/i),
    );
  });
});
