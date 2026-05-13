import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/modules/youth/components/YouthExchangeSurface", () => ({
  YouthExchangeSurface: () => (
    <div data-testid="youth-exchange-preview">Tauschen Preview</div>
  ),
}));

vi.mock("@/modules/youth/components/YouthGroupsSurface", () => ({
  YouthGroupsSurface: () => (
    <div data-testid="youth-groups-preview">Gruppen Preview</div>
  ),
}));

describe("YouthExchangePreviewPages", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rendert die lokale Tausch-Preview in Entwicklungsumgebungen", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: YouthExchangePreviewPage } = await import(
      "@/app/jugend-tauschen-preview/page"
    );

    render(await YouthExchangePreviewPage());

    expect(screen.getByTestId("youth-exchange-preview")).toBeInTheDocument();
  });

  it("rendert die lokale Gruppen-Preview in Entwicklungsumgebungen", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { default: YouthGroupsPreviewPage } = await import(
      "@/app/jugend-gruppen-preview/page"
    );

    render(await YouthGroupsPreviewPage());

    expect(screen.getByTestId("youth-groups-preview")).toBeInTheDocument();
  });

  it("blockiert die lokalen Jugend-Previews in Production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: YouthExchangePreviewPage } = await import(
      "@/app/jugend-tauschen-preview/page"
    );
    const { default: YouthGroupsPreviewPage } = await import(
      "@/app/jugend-gruppen-preview/page"
    );

    await expect(YouthExchangePreviewPage()).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(YouthGroupsPreviewPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
