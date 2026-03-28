import { render, screen } from "@testing-library/react";
import { HelperCard } from "@/modules/care/components/helpers/HelperCard";
import { describe, it, expect, vi } from "vitest";
import type { CareHelper } from "@/lib/care/types";

// Test-Helfer mit allen Pflichtfeldern
const mockHelper: CareHelper = {
  id: "helper-1",
  user_id: "user-123",
  role: "neighbor",
  verification_status: "pending",
  verified_by: null,
  skills: [],
  response_count: 0,
  avg_response_minutes: null,
  user: { display_name: "Max Mustermann", avatar_url: null },
  created_at: "2026-03-21T00:00:00Z",
  updated_at: "2026-03-21T00:00:00Z",
  assigned_seniors: [],
  availability: null,
};

describe("HelperCard — Selbst-Verifikation", () => {
  it("zeigt Verifizieren-Button NICHT fuer eigenen Eintrag", () => {
    render(
      <HelperCard
        helper={mockHelper}
        showVerifyButton
        currentUserId="user-123"
        onVerify={vi.fn()}
      />,
    );
    expect(screen.queryByText("Verifizieren")).not.toBeInTheDocument();
  });

  it("zeigt Verifizieren-Button fuer fremden Eintrag", () => {
    render(
      <HelperCard
        helper={mockHelper}
        showVerifyButton
        currentUserId="user-999"
        onVerify={vi.fn()}
      />,
    );
    // Mindestens ein Button vorhanden (StrictMode kann doppelt rendern)
    expect(screen.getAllByText("Verifizieren").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("zeigt Verifizieren-Button wenn currentUserId nicht gesetzt (Admin-Ansicht)", () => {
    render(
      <HelperCard helper={mockHelper} showVerifyButton onVerify={vi.fn()} />,
    );
    // Mindestens ein Button vorhanden (StrictMode kann doppelt rendern)
    expect(screen.getAllByText("Verifizieren").length).toBeGreaterThanOrEqual(
      1,
    );
  });
});
