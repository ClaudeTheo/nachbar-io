import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/app/ui-modes-preview/UiModesPreviewClient", () => ({
  UiModesPreviewClient: () => (
    <div data-testid="ui-modes-preview-client">UI-Modi Preview</div>
  ),
}));

describe("UiModesPreviewPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rendert die lokale 4-Modi-Preview in Entwicklungsumgebungen", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: UiModesPreviewPage } = await import(
      "@/app/ui-modes-preview/page"
    );

    render(await UiModesPreviewPage());

    expect(screen.getByTestId("ui-modes-preview-client")).toBeTruthy();
  });

  it("blockiert die Preview in Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: UiModesPreviewPage } = await import(
      "@/app/ui-modes-preview/page"
    );

    await expect(UiModesPreviewPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
