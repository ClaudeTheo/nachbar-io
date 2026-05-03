// __tests__/app/senior/local-preview.test.tsx
// Lokale Senior-Preview darf ohne Auth und ohne Supabase-Seeding rendern.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

describe("SeniorLocalPreviewPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert den Senior-Einstieg mit grossen Kernaktionen", async () => {
    const { default: SeniorLocalPreviewPage } = await import(
      "@/app/senior/preview/page"
    );

    render(await SeniorLocalPreviewPage());

    expect(screen.getByText(/Guten Tag, Erika/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hilfe anfragen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alles in Ordnung/i })).toBeInTheDocument();
  });
});
