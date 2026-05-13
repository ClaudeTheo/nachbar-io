import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/app/map-activity-pins-preview/ActivityPinsMapPreviewClient", () => ({
  ActivityPinsMapPreviewClient: () => (
    <div data-testid="activity-pins-preview-client">Preview Client</div>
  ),
}));

describe("MapActivityPinsPreviewPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rendert die lokale Preview in Entwicklungsumgebungen", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: MapActivityPinsPreviewPage } = await import(
      "@/app/map-activity-pins-preview/page"
    );

    render(await MapActivityPinsPreviewPage());

    expect(screen.getByTestId("activity-pins-preview-client")).toBeTruthy();
  });

  it("blockiert die Preview in Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: MapActivityPinsPreviewPage } = await import(
      "@/app/map-activity-pins-preview/page"
    );

    await expect(MapActivityPinsPreviewPage()).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
