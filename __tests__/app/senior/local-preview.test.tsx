// __tests__/app/senior/local-preview.test.tsx
// Lokale Senior-Preview darf ohne Auth und ohne Supabase-Seeding rendern.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  // KreisStartPage rendert seit W5 SeniorConsentPrompt (Client, useRouter).
  useRouter: () => ({ refresh: vi.fn() }),
}));

// KreisStartPage ist seit Welle SB async + laedt Foto/Stickies — Supabase-Server-
// Client + Senior-Kiosk-Service mocken (leere Daten -> nur die 4 Kacheln).
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: vi.fn(() => ({})),
}));

vi.mock("@/lib/family-setup/senior-consent.service", () => ({
  listPendingSeniorConsents: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  getSeniorHouseholdPhotos: vi.fn().mockResolvedValue([]),
  getSeniorHouseholdStickies: vi.fn().mockResolvedValue([]),
}));

describe("SeniorLocalPreviewPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert den echten Senior-Kreis-Start mit vier Kacheln", async () => {
    const { default: SeniorLocalPreviewPage } = await import(
      "@/app/senior/preview/page"
    );

    render(await SeniorLocalPreviewPage());

    expect(screen.getAllByTestId("kreis-start-tile")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /Mein Kreis/i })).toHaveAttribute(
      "href",
      "/familienkreis",
    );
    expect(screen.getByRole("link", { name: /Notfall/i })).toHaveAttribute(
      "href",
      "/sos",
    );
  });
});
