// __tests__/components/admin/OnboardingManager.test.tsx
// Welle W4-FULL — UI fuer Onboarding-Pipeline (Probe + Stops + Crawl).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { OnboardingManager } from "@/app/(app)/admin/components/OnboardingManager";

// --- Mocks ---

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// --- Helpers ---

const QUARTERS = [
  { id: "q-bs", name: "Bad Saeckingen Pilot", city: "Bad Saeckingen" },
  { id: "q-test", name: "Test-Quartier", city: "Test" },
];

const HAPPY_PATH = {
  quarterId: "q-bs",
  domain: "https://stadt.test",
  feeds: { rss: "https://stadt.test/events.rss", ical: "https://stadt.test/events.ics" },
  stops: [
    { id: "s1", name: "Bahnhof", lat: 47.5, lng: 7.96, type: "stop", distanceMeters: 120 },
    { id: "s2", name: "Schoepfle", lat: 47.5, lng: 7.96, type: "stop", distanceMeters: 480 },
  ],
  events: [
    {
      source: "ical",
      feedUrl: "https://stadt.test/events.ics",
      uid: "1",
      title: "Wochenmarkt",
      description: null,
      location: "Muensterplatz",
      startDate: "2026-06-01",
      endDate: null,
      link: null,
      isAllDay: true,
    },
  ],
  fetchedFromRss: 0,
  fetchedFromIcal: 1,
  errors: [],
};

function mockFetchSequence(
  handlers: Array<(url: string, init?: RequestInit) => Response | Promise<Response>>,
) {
  let i = 0;
  const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const handler = handlers[i++];
    if (!handler) throw new Error(`Unmocked fetch ${i}: ${String(url)}`);
    return handler(String(url), init);
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// --- Tests ---

describe("OnboardingManager", () => {
  it("laedt Quartiere und zeigt Selector", async () => {
    mockFetchSequence([() => jsonResponse(QUARTERS)]);
    render(<OnboardingManager />);
    await waitFor(() => {
      expect(screen.getByText("Bad Saeckingen Pilot")).toBeTruthy();
    });
  });

  it("Onboarding-Start ruft POST mit domain und zeigt Ergebnis-Sektionen", async () => {
    let capturedBody: unknown = null;
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      (url, init) => {
        expect(url).toContain("/api/admin/quarters/q-bs/onboard");
        expect(init?.method).toBe("POST");
        capturedBody = JSON.parse(init?.body as string);
        return jsonResponse(HAPPY_PATH);
      },
    ]);

    render(<OnboardingManager />);
    await waitFor(() => screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.click(screen.getByText("Bad Saeckingen Pilot"));

    const domainInput = screen.getByLabelText(/Stadt-Domain/i) as HTMLInputElement;
    fireEvent.change(domainInput, { target: { value: "https://stadt.test" } });

    fireEvent.click(screen.getByRole("button", { name: /Onboarding starten/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bahnhof/)).toBeTruthy();
    });
    expect(capturedBody).toEqual({ domain: "https://stadt.test" });

    // Feeds, Stops, Events alle sichtbar
    expect(screen.getByText(/events\.rss/)).toBeTruthy();
    expect(screen.getByText(/events\.ics/)).toBeTruthy();
    expect(screen.getByText("Wochenmarkt")).toBeTruthy();
    expect(screen.getByText(/2 Stop/)).toBeTruthy();
    expect(screen.getByText(/1 Event/)).toBeTruthy();
  });

  it("zeigt Hinweis wenn keine Feeds gefunden wurden", async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () =>
        jsonResponse({
          quarterId: "q-bs",
          domain: "https://stadt.test",
          feeds: { rss: null, ical: null },
          stops: [],
          events: [],
          fetchedFromRss: 0,
          fetchedFromIcal: 0,
          errors: ["Probe-Hinweise: 7 Pfade ohne Feed-Match."],
        }),
    ]);

    render(<OnboardingManager />);
    await waitFor(() => screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.click(screen.getByText("Bad Saeckingen Pilot"));

    fireEvent.change(screen.getByLabelText(/Stadt-Domain/i), {
      target: { value: "https://stadt.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Onboarding starten/i }));

    await waitFor(() => {
      expect(screen.getByText(/keine Feeds gefunden|0 Feeds/i)).toBeTruthy();
    });
  });

  it("Stops-Apply-Button ruft Apply-Endpoint mit den gefundenen Stops", async () => {
    let capturedApplyBody: unknown = null;
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () => jsonResponse(HAPPY_PATH),
      (url, init) => {
        expect(url).toContain("/api/admin/quarters/q-bs/oepnv-stops");
        expect(init?.method).toBe("POST");
        capturedApplyBody = JSON.parse(init?.body as string);
        return jsonResponse({ savedCount: 2 });
      },
    ]);

    render(<OnboardingManager />);
    await waitFor(() => screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.click(screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.change(screen.getByLabelText(/Stadt-Domain/i), {
      target: { value: "https://stadt.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Onboarding starten/i }));
    await waitFor(() => screen.getByText("Bahnhof"));

    fireEvent.click(screen.getByRole("button", { name: /Stops uebernehmen/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled();
    });
    expect(capturedApplyBody).toEqual({
      stops: [
        { id: "s1", name: "Bahnhof" },
        { id: "s2", name: "Schoepfle" },
      ],
    });
  });

  it("Onboarding-Fehler zeigt Toast", async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () => jsonResponse({ error: "Server-Fehler" }, 500),
    ]);

    render(<OnboardingManager />);
    await waitFor(() => screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.click(screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.change(screen.getByLabelText(/Stadt-Domain/i), {
      target: { value: "https://stadt.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Onboarding starten/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it("zeigt errors[] aus Response prominent", async () => {
    mockFetchSequence([
      () => jsonResponse(QUARTERS),
      () =>
        jsonResponse({
          ...HAPPY_PATH,
          errors: ["Stops-Discover-Fehler: DB nicht erreichbar"],
        }),
    ]);

    render(<OnboardingManager />);
    await waitFor(() => screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.click(screen.getByText("Bad Saeckingen Pilot"));
    fireEvent.change(screen.getByLabelText(/Stadt-Domain/i), {
      target: { value: "https://stadt.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Onboarding starten/i }));

    await waitFor(() => {
      expect(screen.getByText(/DB nicht erreichbar/)).toBeTruthy();
    });
  });
});
