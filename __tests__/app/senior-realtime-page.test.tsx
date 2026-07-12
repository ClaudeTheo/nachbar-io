import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockIsEnabled, mockRedirect } = vi.hoisted(() => ({
  mockIsEnabled: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("@/lib/ai/realtime-voice", () => ({
  isRealtimeVoiceEnabled: mockIsEnabled,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/modules/voice/components/companion/DialogMode", () => ({
  DialogMode: () => <div>Senior-Realtime-Inhalt</div>,
}));

describe("Senior Sprachbegleiter", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("leitet bei deaktiviertem Server-Gate zur Senior-Startseite", async () => {
    mockIsEnabled.mockReturnValue(false);
    const { default: SeniorRealtimePage } = await import(
      "@/app/(senior)/sprachbegleiter/page"
    );

    SeniorRealtimePage();

    expect(mockRedirect).toHaveBeenCalledWith("/kreis-start");
  });

  it("rendert bei aktivem Gate die Senior-Realtime-UI", async () => {
    mockIsEnabled.mockReturnValue(true);
    const { default: SeniorRealtimePage } = await import(
      "@/app/(senior)/sprachbegleiter/page"
    );

    render(SeniorRealtimePage());

    expect(screen.getByRole("heading", { name: /Mit KI sprechen/i })).toBeInTheDocument();
    expect(screen.getByText("Senior-Realtime-Inhalt")).toBeInTheDocument();
  });
});
