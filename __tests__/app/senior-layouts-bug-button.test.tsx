// __tests__/app/senior-layouts-bug-button.test.tsx
// Prueft, dass BugReportButton in beiden Senior-Layouts gerendert wird.
// Hintergrund: Handoff 2026-05-11 (Pkt 2) — Senior-App Stufe-1 braucht Bug-Button,
// damit Pilot-Founder/Senior auf den Senior-Pages Bugs melden kann.

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// BugReportButton als Stub mocken — der echte Button braucht html2canvas,
// Supabase-Browser-Client und Scroll-Listener; wir testen nur, dass er
// vom Layout gemountet wird.
vi.mock("@/components/BugReportButton", () => ({
  BugReportButton: () => <div data-testid="bug-report-button-stub" />,
}));

// Naechste Imports nach den Mocks
vi.mock("next/navigation", () => ({
  usePathname: () => "/senior/home",
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

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
}));

import SeniorDeviceLayout from "@/app/(senior)/layout";
import SeniorWebLayout from "@/app/senior/layout";

describe("Senior-Layouts: BugReportButton-Integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("rendert BugReportButton im (senior)/layout (Senior-Geraet)", () => {
    render(
      <SeniorDeviceLayout>
        <div data-testid="senior-child">Test</div>
      </SeniorDeviceLayout>,
    );

    expect(screen.getByTestId("bug-report-button-stub")).toBeDefined();
    expect(screen.getByTestId("senior-child")).toBeDefined();
  });

  it("rendert BugReportButton im senior/layout (Web-Senior-Modus)", () => {
    render(
      <SeniorWebLayout>
        <div data-testid="senior-child">Test</div>
      </SeniorWebLayout>,
    );

    expect(screen.getByTestId("bug-report-button-stub")).toBeDefined();
    expect(screen.getByTestId("senior-child")).toBeDefined();
  });
});
