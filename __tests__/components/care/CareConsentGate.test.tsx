import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CareConsentGate } from "@/modules/care/components/consent/CareConsentGate";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockFetchResponse = { consents: {}, has_any_consent: false };
let mockFetchOk = true;

beforeEach(() => {
  mockPush.mockClear();
  mockFetchOk = true;
  mockFetchResponse = { consents: {}, has_any_consent: false };
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: mockFetchOk,
      json: () => Promise.resolve(mockFetchResponse),
    }),
  ) as unknown as typeof global.fetch;
});

describe("CareConsentGate", () => {
  it("leitet zu /care/consent weiter wenn kein Consent", async () => {
    mockFetchResponse = { consents: {}, has_any_consent: false };
    render(
      <CareConsentGate>
        <div>Dashboard</div>
      </CareConsentGate>,
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/care/consent");
    });
  });

  it("rendert children wenn Consent vorhanden", async () => {
    mockFetchResponse = {
      consents: {
        sos: {
          granted: true,
          granted_at: "2026-01-01",
          consent_version: "1.0",
        },
      },
      has_any_consent: true,
    };
    render(
      <CareConsentGate>
        <div>Dashboard</div>
      </CareConsentGate>,
    );
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("leitet weiter bei API-Fehler", async () => {
    mockFetchOk = false;
    render(
      <CareConsentGate>
        <div>Dashboard</div>
      </CareConsentGate>,
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/care/consent");
    });
  });
});
