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

const aiTestPilot = {
  ...pendingPilot,
  id: "user-ai-test",
  display_name: "AI-Test Erika",
  settings: {
    pilot_approval_status: "approved",
    is_test_user: true,
    test_user_kind: "ai_pilot",
    must_delete_before_pilot: true,
    pilot_role: "test_user",
  },
};

const realPilot = {
  ...pendingPilot,
  id: "user-real",
  display_name: "Paula Echt",
  settings: {
    pilot_approval_status: "approved",
    pilot_role: "resident",
  },
};

const caregiverPilot = {
  ...pendingPilot,
  id: "user-caregiver",
  display_name: "Clara Begleiterin",
  settings: {
    pilot_approval_status: "approved",
    pilot_role: "caregiver",
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

  it("markiert AI-Testnutzer sichtbar in der Nutzerliste", async () => {
    const { UserManagement } = await import(
      "@/app/(app)/admin/components/UserManagement"
    );

    render(<UserManagement users={[aiTestPilot, realPilot]} onRefresh={vi.fn()} />);

    expect(screen.getByText("AI-Test Erika")).toBeInTheDocument();
    expect(screen.getByText("AI-Test")).toBeInTheDocument();
    expect(screen.getByText("1 AI-Test")).toBeInTheDocument();
  });

  it("filtert die Nutzerliste auf AI-Testnutzer", async () => {
    const { UserManagement } = await import(
      "@/app/(app)/admin/components/UserManagement"
    );

    render(<UserManagement users={[aiTestPilot, realPilot]} onRefresh={vi.fn()} />);

    expect(screen.getByText("AI-Test Erika")).toBeInTheDocument();
    expect(screen.getByText("Paula Echt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "AI-Test (1)" }));

    expect(screen.getByText("AI-Test Erika")).toBeInTheDocument();
    expect(screen.queryByText("Paula Echt")).not.toBeInTheDocument();
  });

  it("zeigt die Pilot-Rolle in der Nutzerliste", async () => {
    const { UserManagement } = await import(
      "@/app/(app)/admin/components/UserManagement"
    );

    render(<UserManagement users={[realPilot, caregiverPilot]} onRefresh={vi.fn()} />);

    expect(screen.getByText("Paula Echt")).toBeInTheDocument();
    expect(screen.getByText("Nutzt selbst")).toBeInTheDocument();
    expect(screen.getByText("Clara Begleiterin")).toBeInTheDocument();
    expect(screen.getByText("Unterstuetzt")).toBeInTheDocument();
  });

  it("filtert die Nutzerliste nach Pilot-Rolle", async () => {
    const { UserManagement } = await import(
      "@/app/(app)/admin/components/UserManagement"
    );

    render(<UserManagement users={[realPilot, caregiverPilot, aiTestPilot]} onRefresh={vi.fn()} />);

    expect(screen.getByText("Paula Echt")).toBeInTheDocument();
    expect(screen.getByText("Clara Begleiterin")).toBeInTheDocument();
    expect(screen.getByText("AI-Test Erika")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unterstuetzer (1)" }));

    expect(screen.queryByText("Paula Echt")).not.toBeInTheDocument();
    expect(screen.getByText("Clara Begleiterin")).toBeInTheDocument();
    expect(screen.queryByText("AI-Test Erika")).not.toBeInTheDocument();
  });
});
