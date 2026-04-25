import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ update: mockUpdate }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/app/(app)/admin/components/VerificationQueue", () => ({
  VerificationQueue: () => <div data-testid="verification-queue" />,
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const pendingPilot = {
  id: "user-pending",
  email_hash: "hash",
  display_name: "Paula Pending",
  avatar_url: null,
  bio: null,
  phone: null,
  ui_mode: "active" as const,
  trust_level: "new" as const,
  is_admin: false,
  created_at: "2026-04-25T10:00:00.000Z",
  last_seen: "2026-04-25T12:00:00.000Z",
  settings: {
    pilot_approval_status: "pending",
    onboarding_source: "closed-pilot",
  },
};

describe("UserManagement Pilot-Freigaben", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  it("zeigt pending Closed-Pilot-Nutzer in der Nutzerverwaltung", async () => {
    const { UserManagement } = await import(
      "@/app/(app)/admin/components/UserManagement"
    );

    render(<UserManagement users={[pendingPilot]} onRefresh={vi.fn()} />);

    expect(screen.getByText("Pilot-Freigaben")).toBeInTheDocument();
    expect(screen.getAllByText("1 wartet").length).toBeGreaterThan(0);
    expect(screen.getByText("Pilot wartet")).toBeInTheDocument();
  });

  it("gibt einen pending Nutzer fuer den Closed Pilot frei", async () => {
    const onRefresh = vi.fn();
    const { UserManagement } = await import(
      "@/app/(app)/admin/components/UserManagement"
    );

    render(<UserManagement users={[pendingPilot]} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByText("Paula Pending").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Pilot freigeben" }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpdate).toHaveBeenCalledWith({
        trust_level: "verified",
        settings: {
          pilot_approval_status: "approved",
          onboarding_source: "closed-pilot",
        },
      });
      expect(mockEq).toHaveBeenCalledWith("id", "user-pending");
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
