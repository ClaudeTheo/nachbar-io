// __tests__/components/senior/SeniorScreensaver.test.tsx
// Welle SB-3: Foto-Karussell als Ruhezustand der Senior-Shell.
// useIdleTimer wird gemockt, um den Idle-Zustand deterministisch zu steuern;
// fetch liefert die Fotos von GET /api/senior/photos.

import {
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
  vi,
} from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";

const h = vi.hoisted(() => ({
  idle: { isIdle: false, wake: vi.fn() } as {
    isIdle: boolean;
    wake: () => void;
  },
}));

vi.mock("@/lib/terminal/useIdleTimer", () => ({
  useIdleTimer: () => h.idle,
}));

import { SeniorScreensaver } from "@/modules/care/components/senior/SeniorScreensaver";

function mockFetchPhotos(photos: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => photos,
  }) as unknown as typeof fetch;
}

describe("SeniorScreensaver (SB-3)", () => {
  afterEach(cleanup);
  beforeEach(() => {
    h.idle = { isIdle: false, wake: vi.fn() };
    mockFetchPhotos([]);
  });

  it("rendert nichts solange nicht idle — und ruft die API nicht ab", () => {
    render(<SeniorScreensaver />);
    expect(screen.queryByTestId("senior-screensaver")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("zeigt das Karussell nach Idle mit Foto und Caption", async () => {
    h.idle = { isIdle: true, wake: vi.fn() };
    mockFetchPhotos([
      { id: "p1", url: "https://signed/1.jpg", caption: "Gruss vom See" },
    ]);

    render(<SeniorScreensaver />);

    const overlay = await screen.findByTestId("senior-screensaver");
    expect(overlay).toBeDefined();
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://signed/1.jpg");
    expect(screen.getByText(/Gruss vom See/)).toBeDefined();
  });

  it("beendet sich bei Tap (ruft wake)", async () => {
    const wake = vi.fn();
    h.idle = { isIdle: true, wake };
    mockFetchPhotos([
      { id: "p1", url: "https://signed/1.jpg", caption: null },
    ]);

    render(<SeniorScreensaver />);
    const overlay = await screen.findByTestId("senior-screensaver");
    fireEvent.click(overlay);
    expect(wake).toHaveBeenCalled();
  });

  it("zeigt kein Overlay wenn der Haushalt keine Fotos hat", async () => {
    h.idle = { isIdle: true, wake: vi.fn() };
    mockFetchPhotos([]);

    render(<SeniorScreensaver />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTestId("senior-screensaver")).toBeNull();
  });
});
