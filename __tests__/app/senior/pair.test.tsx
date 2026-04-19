// __tests__/app/senior/pair.test.tsx
// Welle B Task B6: Senior-Pair-Seite

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: (props: { value: string }) => (
    <div data-testid="qr-code" data-qr-value={props.value} />
  ),
}));

const fetchMock = vi.fn();

const originalPlay = window.HTMLMediaElement.prototype.play;

describe("SeniorPairPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Prototype zuruecksetzen, damit nachfolgende Tests keinen Leak-Mock sehen
    window.HTMLMediaElement.prototype.play = originalPlay;
  });

  function mockStartOk(token = "eyJTEST", pair_id = "pid-1") {
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({
        token,
        pair_id,
        device_id: "dev-1",
        expires_in: 600,
      }),
    }));
  }

  function alwaysStatus(body: Record<string, unknown>) {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/api/device/pair/status")) {
        return { ok: true, json: async () => body } as Response;
      }
      throw new Error("unexpected fetch: " + url);
    });
  }

  it("zeigt nach Pair-Start einen QR-Code mit dem Token", async () => {
    mockStartOk("eyJABC");
    alwaysStatus({ status: "pending" });
    const { default: PairPage } = await import("@/app/(senior)/pair/page");
    render(<PairPage />);
    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveAttribute(
        "data-qr-value",
        "eyJABC",
      );
    });
  });

  it("zeigt einen Hinweistext fuer den Senior", async () => {
    mockStartOk();
    alwaysStatus({ status: "pending" });
    const { default: PairPage } = await import("@/app/(senior)/pair/page");
    render(<PairPage />);
    await waitFor(() => {
      expect(screen.getByText(/angeh|fotograf/i)).toBeInTheDocument();
    });
  });

  it("speichert refresh_token in localStorage und navigiert wenn paired", async () => {
    mockStartOk();
    alwaysStatus({
      status: "paired",
      refresh_token: "rt-secret-123",
      user_id: "u-senior",
      device_id: "dev-1",
      expires_at: "2026-10-19T00:00:00.000Z",
    });
    const { default: PairPage } = await import("@/app/(senior)/pair/page");
    render(<PairPage />);
    // Polling laeuft alle 2s. Warte bis Navigation aufgerufen wird.
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/");
      },
      { timeout: 5000, interval: 100 },
    );
    expect(window.localStorage.getItem("nachbar.senior.refresh_token")).toBe(
      "rt-secret-123",
    );
    expect(window.localStorage.getItem("nachbar.senior.user_id")).toBe(
      "u-senior",
    );
  });

  it("spielt pair-welcome.mp3 genau einmal beim ersten Mount", async () => {
    mockStartOk();
    alwaysStatus({ status: "pending" });
    const playMock = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = playMock;

    const { default: PairPage } = await import("@/app/(senior)/pair/page");
    render(<PairPage />);
    await waitFor(() => {
      expect(screen.getByTestId("pair-welcome-audio")).toBeInTheDocument();
    });
    const audio = screen.getByTestId("pair-welcome-audio") as HTMLAudioElement;
    expect(audio).toHaveAttribute("src", "/audio/pair-welcome.mp3");
    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
    });
  });

  it("spielt Audio auch nach mehreren Polls weiterhin nur einmal", async () => {
    mockStartOk();
    alwaysStatus({ status: "pending" });
    const playMock = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = playMock;

    const { default: PairPage } = await import("@/app/(senior)/pair/page");
    render(<PairPage />);
    await waitFor(() => {
      expect(playMock).toHaveBeenCalledTimes(1);
    });
    // Kleine Pause, damit Polling-Timer mindestens einmal tickt
    await new Promise((r) => setTimeout(r, 2100));
    // Trotz mehrfacher Polls darf play() nur einmal aufgerufen sein
    expect(playMock).toHaveBeenCalledTimes(1);
  }, 10000);

  it("zeigt Fehler-Hinweis wenn /pair/start fehlschlaegt", async () => {
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    }));
    const { default: PairPage } = await import("@/app/(senior)/pair/page");
    render(<PairPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/nicht moeglich|verbindung|fehler/i),
      ).toBeInTheDocument();
    });
  });
});
