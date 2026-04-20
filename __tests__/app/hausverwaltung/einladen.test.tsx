import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import HausverwaltungEinladenPage from "@/app/(app)/hausverwaltung/einladen/page";

describe("HausverwaltungEinladenPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert Headline und Formular-Felder", () => {
    render(<HausverwaltungEinladenPage />);
    expect(screen.getByText(/Hausverwaltung einladen/i)).toBeTruthy();
    expect(screen.getByLabelText(/Name der Hausverwaltung/i)).toBeTruthy();
    expect(screen.getByLabelText(/E-Mail.*optional/i)).toBeTruthy();
  });

  it("erzeugt Einladung und zeigt Code + Magic-Link nach Submit", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "tok-abc",
        code: "123456",
        expiresAt: "2026-05-20T00:00:00Z",
        magicLinkUrl: "http://localhost/einladung/tok-abc",
      }),
    });

    render(<HausverwaltungEinladenPage />);
    fireEvent.change(screen.getByLabelText(/Name der Hausverwaltung/i), {
      target: { value: "Hausverwaltung Mueller" },
    });
    fireEvent.change(screen.getByLabelText(/E-Mail.*optional/i), {
      target: { value: "info@mueller-hv.de" },
    });

    const submit = screen.getByRole("button", { name: /Einladung erstellen/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(screen.getByText("123456")).toBeTruthy();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/housing/invitations",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("zeigt Fehlermeldung bei API-Fehler", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Kein Haushalt gefunden" }),
    });

    render(<HausverwaltungEinladenPage />);
    fireEvent.change(screen.getByLabelText(/Name der Hausverwaltung/i), {
      target: { value: "HV X" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Einladung erstellen/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Kein Haushalt gefunden/)).toBeTruthy();
    });
  });

  it("Submit-Button disabled bei leerem HV-Namen", () => {
    render(<HausverwaltungEinladenPage />);
    const submit = screen.getByRole("button", {
      name: /Einladung erstellen/i,
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});
