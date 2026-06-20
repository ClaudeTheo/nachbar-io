// Welle C - Senior-Touch-Targets.
// Die Senior-Navigation muss die 80px-Regel auch fuer sekundaere Aktionen
// einhalten, nicht nur fuer die grossen Kernkacheln.

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/senior/home",
}));

vi.mock("@/components/BugReportButton", () => ({
  BugReportButton: ({ senior }: { senior?: boolean }) => (
    <button
      data-testid="bug-report-fab"
      style={{
        minHeight: senior ? "80px" : undefined,
        minWidth: senior ? "80px" : undefined,
      }}
    >
      Bug melden
    </button>
  ),
}));

vi.mock("@/components/senior/PushBanner", () => ({
  PushBanner: () => <div data-testid="push-banner-stub" />,
}));

vi.mock("@/components/senior/RefreshRotationMounter", () => ({
  RefreshRotationMounter: () => null,
}));

// GlobalCallListener (seit S2-5 im (senior)-Layout) nutzt useRouter + Realtime —
// hier nicht unter Test, daher stubben (analog BugReportButton/PushBanner).
vi.mock("@/components/video/GlobalCallListener", () => ({
  GlobalCallListener: () => null,
}));

// KreisStartPage ist seit Welle SB eine async Server-Komponente (laedt Foto +
// Stickies) — Supabase-Server-Client + Senior-Kiosk-Service mocken.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  getSeniorHouseholdPhotos: vi.fn().mockResolvedValue([]),
  getSeniorHouseholdStickies: vi.fn().mockResolvedValue([]),
}));

afterEach(() => {
  cleanup();
});

describe("SeniorLayout Touch-Targets", () => {
  it("Header-Zurueckaktion und Notruf-Leiste haben mindestens 80px Touch-Hoehe", async () => {
    const { default: SeniorLayout } = await import("@/app/senior/layout");

    render(
      <SeniorLayout>
        <p>Inhalt</p>
      </SeniorLayout>,
    );

    expect(
      screen.getByRole("link", { name: /zur startseite|zurueck|zurück/i })
        .style.minHeight,
    ).toBe("80px");
    expect(screen.getByRole("link", { name: /notruf 112/i }).style.minHeight)
      .toBe("80px");
  });
});

describe("SeniorDeviceLayout Touch-Targets", () => {
  it("zeigt auf /kreis-start dauerhaft Notruf 112 und 80px Bug-Melden-Ziel", async () => {
    const { default: SeniorDeviceLayout } = await import(
      "@/app/(senior)/layout"
    );

    render(
      <SeniorDeviceLayout>
        <p>Inhalt</p>
      </SeniorDeviceLayout>,
    );

    const notruf = screen.getByRole("link", { name: /notruf 112/i });
    expect(notruf).toHaveAttribute("href", "tel:112");
    expect(notruf.style.minHeight).toBe("80px");
    expect(screen.getByTestId("bug-report-fab").style.minHeight).toBe("80px");
  });
});

describe("KreisStartPage Touch-Targets", () => {
  it("sekundaere Start-Aktionen Termine und Mein Profil sind 80px Touch-Targets", async () => {
    const { default: KreisStartPage } = await import(
      "@/app/(senior)/kreis-start/page"
    );

    render(await KreisStartPage());

    const secondaryActions = screen.getByTestId("kreis-start-secondary-actions");
    expect(
      within(secondaryActions).getByRole("link", { name: /termine/i }).style
        .minHeight,
    ).toBe("80px");
    expect(
      within(secondaryActions).getByRole("link", { name: /mein profil/i }).style
        .minHeight,
    ).toBe("80px");
  });
});
