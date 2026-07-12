import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/voice/components/companion/CompanionChat", () => ({
  CompanionChat: () => <div>Chat-Inhalt</div>,
}));

vi.mock("@/modules/voice/components/companion/DialogMode", () => ({
  DialogMode: () => <div>Realtime-Inhalt</div>,
}));

describe("Companion Realtime Gate", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("zeigt ohne Server-Flag keinen Sprechen-Einstieg", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("REALTIME_VOICE_ENABLED", "0");
    const { default: CompanionPage } = await import("@/app/(app)/companion/page");

    render(await CompanionPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Chat-Inhalt")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sprechen/i })).not.toBeInTheDocument();
  });

  it("zeigt mit Server-Flag den Realtime-Modus", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("REALTIME_VOICE_ENABLED", "1");
    const { default: CompanionPage } = await import("@/app/(app)/companion/page");

    render(
      await CompanionPage({
        searchParams: Promise.resolve({ mode: "voice" }),
      }),
    );

    expect(screen.getByRole("link", { name: /Sprechen/i })).toBeInTheDocument();
    expect(screen.getByText("Realtime-Inhalt")).toBeInTheDocument();
  });
});
