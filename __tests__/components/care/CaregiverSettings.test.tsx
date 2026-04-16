import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("lucide-react", () => ({
  Users: (props: Record<string, unknown>) => <svg data-testid="users-icon" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
}));

vi.mock("@/modules/care/components/subscription/InviteCodeModal", () => ({
  InviteCodeModal: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>Invite Modal</button>
  ),
}));

const caregiverListSpy = vi.fn();

vi.mock("@/modules/care/components/caregiver/CaregiverList", () => ({
  CaregiverList: (props: {
    activeLinks: Array<unknown>;
    revokedLinks: Array<unknown>;
  }) => {
    caregiverListSpy(props);
    return (
      <div data-testid="caregiver-list">
        active:{props.activeLinks.length} revoked:{props.revokedLinks.length}
      </div>
    );
  },
}));

describe("CaregiverSettings", () => {
  beforeEach(() => {
    caregiverListSpy.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("liest top-level as_resident aus der aktuellen API-Antwort", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          as_resident: [
            {
              id: "link-1",
              resident_id: "resident-1",
              caregiver_id: "caregiver-1",
              relationship_type: "child",
              heartbeat_visible: true,
              created_at: "2026-04-16T10:00:00Z",
              revoked_at: null,
            },
          ],
          as_caregiver: [],
        }),
      }),
    );

    const { CaregiverSettings } = await import(
      "@/modules/care/components/caregiver/CaregiverSettings"
    );

    render(<CaregiverSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("caregiver-list")).toHaveTextContent(
        "active:1 revoked:0",
      );
    });

    expect(
      screen.queryByText("Angehörige konnten nicht geladen werden."),
    ).toBeNull();
  });

  it("unterstuetzt weiterhin verschachtelte data.as_resident Antworten", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            as_resident: [
              {
                id: "link-2",
                resident_id: "resident-1",
                caregiver_id: "caregiver-2",
                relationship_type: "friend",
                heartbeat_visible: false,
                created_at: "2026-04-16T10:00:00Z",
                revoked_at: null,
              },
            ],
          },
        }),
      }),
    );

    const { CaregiverSettings } = await import(
      "@/modules/care/components/caregiver/CaregiverSettings"
    );

    render(<CaregiverSettings />);

    await waitFor(() => {
      expect(screen.getByTestId("caregiver-list")).toHaveTextContent(
        "active:1 revoked:0",
      );
    });
  });
});
