// __tests__/components/caregiver/CaregiverGedaechtnisClient.test.tsx
// Welle C C8 — Tests fuer die Caregiver-Memory-Seiten-UI.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { CaregiverGedaechtnisClient } from "@/modules/memory/components/CaregiverGedaechtnisClient";

const SENIOR_ID = "senior-1";
const CAREGIVER_ID = "caregiver-42";

function mockFetch(
  handlers: Array<{
    urlIncludes: string;
    method?: string;
    response: { success: boolean; data?: unknown; error?: string };
    status?: number;
  }>,
) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const h = handlers.find(
      (x) => url.includes(x.urlIncludes) && (x.method ?? "GET") === method,
    );
    if (!h) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify(h.response), {
      status: h.status ?? 200,
    });
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("CaregiverGedaechtnisClient", () => {
  it("zeigt Empty-State wenn keine Fakten vorhanden", async () => {
    mockFetch([
      {
        urlIncludes: "/api/memory/facts",
        response: { success: true, data: [] },
      },
    ]);

    render(
      <CaregiverGedaechtnisClient
        seniorId={SENIOR_ID}
        seniorName="Anna"
        currentUserId={CAREGIVER_ID}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/noch keine eintraege/i)).toBeTruthy();
    });
  });

  it("zeigt Senior-Name in der Ueberschrift", async () => {
    mockFetch([
      {
        urlIncludes: "/api/memory/facts",
        response: { success: true, data: [] },
      },
    ]);

    render(
      <CaregiverGedaechtnisClient
        seniorId={SENIOR_ID}
        seniorName="Anna"
        currentUserId={CAREGIVER_ID}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /gedaechtnis fuer anna/i }),
      ).toBeTruthy();
    });
  });

  it("zeigt eigene Caregiver-Eintraege mit 'Von Ihnen'-Badge", async () => {
    mockFetch([
      {
        urlIncludes: "/api/memory/facts",
        response: {
          success: true,
          data: [
            {
              id: "f-self",
              category: "profile",
              key: "lieblingsessen",
              value: "Apfelstrudel",
              source: "caregiver",
              source_user_id: CAREGIVER_ID,
            },
            {
              id: "f-other",
              category: "profile",
              key: "hobby",
              value: "Wandern",
              source: "self",
              source_user_id: SENIOR_ID,
            },
          ],
        },
      },
    ]);

    render(
      <CaregiverGedaechtnisClient
        seniorId={SENIOR_ID}
        seniorName="Anna"
        currentUserId={CAREGIVER_ID}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Apfelstrudel")).toBeTruthy();
    });
    expect(screen.getByText("Wandern")).toBeTruthy();
    // Provenance-Badge "Von Ihnen" nur fuer eigenen Eintrag
    expect(screen.getByText(/von ihnen/i)).toBeTruthy();
  });

  it("submittet Form mit POST + targetUserId=seniorId", async () => {
    const fetchMock = mockFetch([
      {
        urlIncludes: "/api/memory/facts",
        method: "GET",
        response: { success: true, data: [] },
      },
      {
        urlIncludes: "/api/memory/facts",
        method: "POST",
        response: {
          success: true,
          data: { id: "f-new", category: "profile", key: "test", value: "xy" },
        },
      },
    ]);

    render(
      <CaregiverGedaechtnisClient
        seniorId={SENIOR_ID}
        seniorName="Anna"
        currentUserId={CAREGIVER_ID}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/stichwort/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/stichwort/i), {
      target: { value: "lieblingsessen" },
    });
    fireEvent.change(screen.getByLabelText(/information/i), {
      target: { value: "Apfelstrudel" },
    });

    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (c) => (c[1] as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(
        ((postCall?.[1] as RequestInit)?.body as string) ?? "{}",
      );
      expect(body.targetUserId).toBe(SENIOR_ID);
      expect(body.key).toBe("lieblingsessen");
      expect(body.value).toBe("Apfelstrudel");
      expect(body.category).toBe("profile");
    });
  });

  it("leert Form-Felder nach erfolgreichem Submit", async () => {
    mockFetch([
      {
        urlIncludes: "/api/memory/facts",
        method: "GET",
        response: { success: true, data: [] },
      },
      {
        urlIncludes: "/api/memory/facts",
        method: "POST",
        response: {
          success: true,
          data: { id: "f-new", category: "profile", key: "x", value: "y" },
        },
      },
    ]);

    render(
      <CaregiverGedaechtnisClient
        seniorId={SENIOR_ID}
        seniorName="Anna"
        currentUserId={CAREGIVER_ID}
      />,
    );

    await waitFor(() => screen.getByLabelText(/stichwort/i));

    const keyInput = screen.getByLabelText(/stichwort/i) as HTMLInputElement;
    const valueInput = screen.getByLabelText(
      /information/i,
    ) as HTMLInputElement;

    fireEvent.change(keyInput, { target: { value: "test" } });
    fireEvent.change(valueInput, { target: { value: "wert" } });
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() => {
      expect(keyInput.value).toBe("");
      expect(valueInput.value).toBe("");
    });
  });

  it("zeigt Fehlermeldung wenn Server 403 no_caregiver_link liefert", async () => {
    mockFetch([
      {
        urlIncludes: "/api/memory/facts",
        method: "GET",
        response: { success: true, data: [] },
      },
      {
        urlIncludes: "/api/memory/facts",
        method: "POST",
        response: { success: false, error: "no_caregiver_link" },
        status: 403,
      },
    ]);

    render(
      <CaregiverGedaechtnisClient
        seniorId={SENIOR_ID}
        seniorName="Anna"
        currentUserId={CAREGIVER_ID}
      />,
    );

    await waitFor(() => screen.getByLabelText(/stichwort/i));

    fireEvent.change(screen.getByLabelText(/stichwort/i), {
      target: { value: "test" },
    });
    fireEvent.change(screen.getByLabelText(/information/i), {
      target: { value: "wert" },
    });
    fireEvent.click(screen.getByRole("button", { name: /speichern/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/keine.*berechtigung|verbindung.*abgelaufen/i),
      ).toBeTruthy();
    });
  });
});
