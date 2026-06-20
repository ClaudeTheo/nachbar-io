// modules/family-setup/components/SetupQrCard.test.tsx
// Nachbar.io — S2-7 (a): "Link teilen" — navigator.share mit Copy-Fallback (Befund A2:1)

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { SetupQrCard } from "./SetupQrCard";

const SETUP_URL = "https://nachbar-io.vercel.app/setup/abc123";
const SHORT_CODE = "K7M2Q9";

function defineNavigatorProp(prop: string, value: unknown) {
  Object.defineProperty(navigator, prop, {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete (navigator as unknown as Record<string, unknown>).share;
});

beforeEach(() => {
  defineNavigatorProp("clipboard", {
    writeText: vi.fn().mockResolvedValue(undefined),
  });
});

describe("SetupQrCard — Link teilen (A2:1)", () => {
  it("zeigt einen 'Link teilen'-Button zusaetzlich zum Kurzcode", () => {
    render(
      <SetupQrCard setupUrl={SETUP_URL} shortCode={SHORT_CODE} kind="senior" />,
    );
    expect(
      screen.getByRole("button", { name: /link teilen/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(SHORT_CODE)).toBeInTheDocument();
  });

  it("nutzt navigator.share mit der setupUrl, wenn verfuegbar", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    defineNavigatorProp("share", shareMock);

    render(
      <SetupQrCard setupUrl={SETUP_URL} shortCode={SHORT_CODE} kind="senior" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /link teilen/i }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: SETUP_URL }),
      );
    });
  });

  it("faellt auf Clipboard zurueck, wenn navigator.share fehlt", async () => {
    // share bewusst nicht definiert
    render(
      <SetupQrCard setupUrl={SETUP_URL} shortCode={SHORT_CODE} kind="senior" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /link teilen/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SETUP_URL);
    });
    // Nutzer-Feedback nach Fallback-Copy
    expect(await screen.findByText(/link kopiert/i)).toBeInTheDocument();
  });
});
