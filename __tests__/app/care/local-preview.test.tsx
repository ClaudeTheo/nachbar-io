// __tests__/app/care/local-preview.test.tsx
// Lokale Care-Previews duerfen ohne Auth und ohne Care-DB-Seeding rendern.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("CareLocalPreviewPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert den Care-Hub mit statischen Einstiegsdaten", async () => {
    const { default: CareLocalPreviewPage } = await import(
      "@/app/(app)/care/preview/page"
    );

    render(await CareLocalPreviewPage());

    expect(
      screen.getByRole("heading", { name: /Mein Tag/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Check-in/i)).toBeInTheDocument();
    expect(screen.getByText(/Medikamente/i)).toBeInTheDocument();
  });
});

describe("CareConsentLocalPreviewPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert Consent-Copy und Einwilligungs-Karten ohne API-Load", async () => {
    const { default: CareConsentLocalPreviewPage } = await import(
      "@/app/(app)/care/consent/preview/page"
    );

    render(await CareConsentLocalPreviewPage());

    expect(screen.getByText(/freiwilligen Einwilligung/i)).toBeInTheDocument();
    expect(screen.getByText(/jederzeit widerrufen/i)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Einwilligung für Notfall/i }),
    ).toBeInTheDocument();
  });
});
