// modules/spiele/components/__tests__/TeilnahmePing.test.tsx
// Welle SP1-4: Der TeilnahmePing ist bewusst von Tagesraetsel GETRENNT, damit
// Tagesraetsel persistenzfrei bleibt (dessen Test verbietet jeden fetch beim
// Antworten). Der Ping feuert einmalig beim Oeffnen einen fire-and-forget-POST
// auf /api/spiele/teilnahme und rendert nichts Sichtbares.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { TeilnahmePing } from "@/modules/spiele/components/TeilnahmePing";

let fetchMock: ReturnType<typeof vi.fn>;

describe("TeilnahmePing (SP1-4)", () => {
  afterEach(cleanup);
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("feuert beim Oeffnen genau einen POST auf /api/spiele/teilnahme", async () => {
    render(<TeilnahmePing />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/spiele/teilnahme");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("rendert nichts Sichtbares", () => {
    const { container } = render(<TeilnahmePing />);
    expect(container.firstChild).toBeNull();
  });

  it("verschluckt Fehler (fire-and-forget, kein Throw)", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(() => render(<TeilnahmePing />)).not.toThrow();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
