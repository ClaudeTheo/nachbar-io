// __tests__/app/care/consent-page.test.tsx
// Welle D: Care-Consent-Copy muss freiwillig und widerrufbar bleiben.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const emptyConsents = {
  sos: { granted: false, granted_at: null, consent_version: "1.0" },
  checkin: { granted: false, granted_at: null, consent_version: "1.0" },
  medications: { granted: false, granted_at: null, consent_version: "1.0" },
  care_profile: { granted: false, granted_at: null, consent_version: "1.0" },
  emergency_contacts: {
    granted: false,
    granted_at: null,
    consent_version: "1.0",
  },
  ai_onboarding: { granted: false, granted_at: null, consent_version: "1.0" },
};

describe("CareConsentPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          consents: emptyConsents,
          has_any_consent: false,
        }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("erklaert Einwilligungen als freiwillig und jederzeit widerrufbar", async () => {
    const { default: CareConsentPage } = await import(
      "@/app/(app)/care/consent/page"
    );

    render(<CareConsentPage />);

    await waitFor(() => {
      expect(screen.getByText(/freiwillig/i)).toBeInTheDocument();
      expect(screen.getByText(/jederzeit widerrufen/i)).toBeInTheDocument();
    });
  });
});
