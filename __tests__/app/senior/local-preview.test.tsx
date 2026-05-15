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

  it("rendert den echten Senior-Kreis-Start mit vier Kacheln", async () => {
    const { default: SeniorLocalPreviewPage } = await import(
      "@/app/senior/preview/page"
    );

    render(await SeniorLocalPreviewPage());

    expect(screen.getAllByTestId("kreis-start-tile")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /Mein Kreis/i })).toHaveAttribute(
      "href",
      "/mein-kreis",
    );
    expect(screen.getByRole("link", { name: /Notfall/i })).toHaveAttribute(
      "href",
      "/sos",
    );
  });
});
