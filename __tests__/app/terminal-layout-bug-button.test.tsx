// __tests__/app/terminal-layout-bug-button.test.tsx
// Prueft, dass BugReportButton im Terminal-Layout (anonymes Pflege-Terminal)
// gerendert wird. Das Terminal hat keinen Auth-User (Pin-basiert), daher
// muss anonymous={true} verwendet werden — sonst wuerde der Submit-Pfad
// supabase.auth.getUser() aufrufen und fehlen lassen.
//
// Hintergrund: Handoff 2026-05-11 (Pkt 6) — niedrige Prio, optional.
// Auto-Memory project_session_handover.md naechster-Schritt Pkt 6.

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// React.use(params) im Layout: TerminalLayout nutzt das Next.js-16-Pattern
// fuer async params. Im jsdom-Test resolved das Promise nicht synchron,
// daher mocken wir use() so, dass es synchrone Werte direkt zurueckgibt.
// Im Test uebergeben wir params bereits als aufgeloestes Objekt.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return {
    ...actual,
    use: <T,>(value: T | Promise<T>) => {
      // Wenn bereits aufgeloest (kein then), direkt zurueckgeben
      if (!value || typeof (value as Promise<T>).then !== "function") {
        return value as T;
      }
      return actual.use(value as Promise<T>);
    },
  };
});

// BugReportButton als Stub mocken — der echte Button braucht html2canvas,
// Supabase-Browser-Client und Scroll-Listener. Wir pruefen nur, dass das
// Terminal-Layout ihn mit anonymous=true mountet.
const bugButtonProps = vi.fn();
vi.mock("@/components/BugReportButton", () => ({
  BugReportButton: (props: { anonymous?: boolean }) => {
    bugButtonProps(props);
    return <div data-testid="bug-report-button-stub" data-anonymous={String(props.anonymous ?? false)} />;
  },
}));

// Terminal-Provider und Subkomponenten stubben — sie binden Supabase-Realtime,
// useTerminalData und Inactivity-Timer, die im jsdom-Test nicht laufen.
vi.mock("@/lib/terminal/TerminalContext", () => ({
  TerminalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="terminal-provider-stub">{children}</div>
  ),
}));

vi.mock("@/components/terminal/TerminalHeader", () => ({
  default: () => <div data-testid="terminal-header-stub" />,
}));

vi.mock("@/components/terminal/TerminalSidebar", () => ({
  default: () => <div data-testid="terminal-sidebar-stub" />,
}));

vi.mock("@/components/terminal/NightModeGate", () => ({
  NightModeGate: () => null,
}));

vi.mock("@/components/terminal/ScreensaverOverlay", () => ({
  default: () => null,
}));

vi.mock("@/components/terminal/AppointmentPopup", () => ({
  default: () => null,
}));

vi.mock("@/components/terminal/video/IncomingCallOverlay", () => ({
  default: () => null,
}));

import TerminalLayout from "@/app/terminal/[token]/layout";

// Hilfs-Wrapper: uebergibt aufgeloeste params (kein Promise) — der Mock von
// react.use() oben gibt synchrone Werte direkt zurueck.
function renderTerminal(token = "test-token", child: React.ReactNode = <div data-testid="terminal-child">Test</div>) {
  // params wird im Layout via `use(params)` ausgepackt — wir uebergeben
  // ein Plain-Object und der use-Mock gibt es direkt zurueck.
  return render(
    <TerminalLayout params={{ token } as unknown as Promise<{ token: string }>}>
      {child}
    </TerminalLayout>,
  );
}

describe("Terminal-Layout: BugReportButton-Integration", () => {
  afterEach(() => {
    cleanup();
    bugButtonProps.mockClear();
  });

  it("rendert BugReportButton im terminal/[token]/layout (anonymes Pflege-Terminal)", () => {
    renderTerminal();

    expect(screen.getByTestId("bug-report-button-stub")).toBeDefined();
    expect(screen.getByTestId("terminal-child")).toBeDefined();
  });

  it("verwendet anonymous={true} (Terminal hat keinen Auth-User)", () => {
    renderTerminal();

    const button = screen.getByTestId("bug-report-button-stub");
    expect(button.getAttribute("data-anonymous")).toBe("true");
    expect(bugButtonProps).toHaveBeenCalledWith(
      expect.objectContaining({ anonymous: true }),
    );
  });
});
