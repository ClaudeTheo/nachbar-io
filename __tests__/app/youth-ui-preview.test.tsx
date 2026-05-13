import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/app/jugend-ui-preview/YouthLocalPreviewClient", () => ({
  YouthLocalPreviewClient: () => (
    <div data-testid="youth-ui-preview-client">Youth Preview</div>
  ),
}));

describe("YouthUiPreviewPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rendert die lokale Jugend-UI-Preview in Entwicklungsumgebungen", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: YouthUiPreviewPage } = await import(
      "@/app/jugend-ui-preview/page"
    );

    render(await YouthUiPreviewPage());

    expect(screen.getByTestId("youth-ui-preview-client")).toBeInTheDocument();
  });

  it("blockiert die Jugend-UI-Preview in Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: YouthUiPreviewPage } = await import(
      "@/app/jugend-ui-preview/page"
    );

    await expect(YouthUiPreviewPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
