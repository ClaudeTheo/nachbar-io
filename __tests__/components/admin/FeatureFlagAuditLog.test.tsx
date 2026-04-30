import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

const AUDIT_ROWS = [
  {
    id: 1,
    flag_key: "BILLING_ENABLED",
    action: "insert",
    enabled_before: null,
    enabled_after: false,
    changed_by: "user-1",
    reason: "Initiale Anlage",
    created_at: "2026-04-30T12:23:00.000Z",
    changed_by_user: {
      email: "admin@example.test",
      display_name: "Admin Nutzerin",
    },
  },
  {
    id: 2,
    flag_key: "TWILIO_ENABLED",
    action: "update",
    enabled_before: false,
    enabled_after: true,
    changed_by: "user-2",
    reason:
      "Sehr langer Grund fuer den Toggle, der in der Tabelle nach sechzig Zeichen abgeschnitten wird.",
    created_at: "2026-04-30T11:05:00.000Z",
    changed_by_user: {
      email: "ops@example.test",
      display_name: null,
    },
  },
  {
    id: 3,
    flag_key: "CHECKIN_MESSAGES_ENABLED",
    action: "delete",
    enabled_before: true,
    enabled_after: null,
    changed_by: null,
    reason: null,
    created_at: "2026-04-30T10:00:00.000Z",
    changed_by_user: null,
  },
];

function setupAuditSelect(data: unknown[] | null, error: unknown = null) {
  mockLimit.mockResolvedValue({ data, error });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
}

describe("FeatureFlagAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
  });

  it("rendert drei Audit-Log-Eintraege aus dem Mock", async () => {
    setupAuditSelect(AUDIT_ROWS);

    const { FeatureFlagAuditLog } = await import(
      "@/app/(app)/admin/components/FeatureFlagAuditLog"
    );

    render(<FeatureFlagAuditLog />);

    await waitFor(() => {
      expect(screen.getByTestId("feature-flag-audit-log")).toBeDefined();
    });

    expect(screen.getByText("BILLING_ENABLED")).toBeDefined();
    expect(screen.getByText("TWILIO_ENABLED")).toBeDefined();
    expect(screen.getByText("CHECKIN_MESSAGES_ENABLED")).toBeDefined();
    expect(screen.getByText("Admin Nutzerin")).toBeDefined();
    expect(screen.getByText("ops@example.test")).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("zeigt Action-Badges fuer insert, update und delete unterschiedlich", async () => {
    setupAuditSelect(AUDIT_ROWS);

    const { FeatureFlagAuditLog } = await import(
      "@/app/(app)/admin/components/FeatureFlagAuditLog"
    );

    render(<FeatureFlagAuditLog />);

    await waitFor(() => {
      expect(screen.getByTestId("action-badge-insert")).toBeDefined();
    });

    expect(screen.getByTestId("action-badge-insert").textContent).toBe(
      "insert",
    );
    expect(screen.getByTestId("action-badge-update").textContent).toBe(
      "update",
    );
    expect(screen.getByTestId("action-badge-delete").textContent).toBe(
      "delete",
    );
    expect(screen.getByTestId("action-badge-insert").className).not.toBe(
      screen.getByTestId("action-badge-delete").className,
    );
  });

  it("zeigt Empty-State, wenn keine Eintraege vorhanden sind", async () => {
    setupAuditSelect([]);

    const { FeatureFlagAuditLog } = await import(
      "@/app/(app)/admin/components/FeatureFlagAuditLog"
    );

    render(<FeatureFlagAuditLog />);

    await waitFor(() => {
      expect(
        screen.getByText("Noch keine Aenderungen aufgezeichnet"),
      ).toBeDefined();
    });
  });

  it("zeigt initial Loading-Skeletons", async () => {
    mockLimit.mockReturnValue(new Promise(() => {}));
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });

    const { FeatureFlagAuditLog } = await import(
      "@/app/(app)/admin/components/FeatureFlagAuditLog"
    );

    render(<FeatureFlagAuditLog />);

    expect(screen.getAllByTestId("audit-log-skeleton").length).toBeGreaterThan(
      0,
    );
  });

  it("filtert nach Flag-Key-Teilstring", async () => {
    setupAuditSelect(AUDIT_ROWS);

    const { FeatureFlagAuditLog } = await import(
      "@/app/(app)/admin/components/FeatureFlagAuditLog"
    );

    render(<FeatureFlagAuditLog />);

    await waitFor(() => {
      expect(screen.getByText("BILLING_ENABLED")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Flag-Key suchen"), {
      target: { value: "twilio" },
    });

    const table = screen.getByTestId("feature-flag-audit-log");
    expect(within(table).queryByText("BILLING_ENABLED")).toBeNull();
    expect(within(table).getByText("TWILIO_ENABLED")).toBeDefined();
    expect(within(table).queryByText("CHECKIN_MESSAGES_ENABLED")).toBeNull();
  });
});
