// components/org/__tests__/OrgDashboard.test.tsx
// Nachbar.io — Tests fuer das Organisations-Dashboard (Pro Community)

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { OrgDashboard } from "../OrgDashboard";
import { OrgMemberList } from "../OrgMemberList";
import type { Organization } from "@/app/(app)/org/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Test-Organisation
function createTestOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-1",
    name: "Pflegedienst Sonnenschein",
    type: "care_service",
    verification_status: "verified",
    hr_vr_number: "VR 12345",
    contact_email: "info@sonnenschein.de",
    contact_phone: "+49 7761 12345",
    address: "Musterstraße 1, 79713 Bad Säckingen",
    created_at: "2026-01-01T00:00:00Z",
    org_members: [
      {
        id: "m-1",
        user_id: "u-1",
        role: "admin",
        assigned_quarters: ["Purkersdorfer Straße", "Sanarystraße"],
      },
      {
        id: "m-2",
        user_id: "u-2",
        role: "viewer",
        assigned_quarters: ["Oberer Rebberg"],
      },
    ],
    ...overrides,
  };
}

describe("OrgDashboard", () => {
  it("zeigt den Organisationsnamen an", () => {
    render(<OrgDashboard org={createTestOrg()} />);
    expect(screen.getByText("Pflegedienst Sonnenschein")).toBeInTheDocument();
  });

  it("zeigt den Organisations-Typ als Badge an", () => {
    render(<OrgDashboard org={createTestOrg()} />);
    expect(screen.getByText("Pflegedienst")).toBeInTheDocument();
  });

  it("zeigt Verifizierungsstatus 'Verifiziert' in gruen", () => {
    render(<OrgDashboard org={createTestOrg({ verification_status: "verified" })} />);
    const badge = screen.getByText("Verifiziert");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-[#4CAF87]");
  });

  it("zeigt Verifizierungsstatus 'Ausstehend' in amber", () => {
    render(<OrgDashboard org={createTestOrg({ verification_status: "pending" })} />);
    const badge = screen.getByText("Ausstehend");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-[#F59E0B]");
  });

  it("zeigt Verifizierungsstatus 'Abgelehnt' in rot", () => {
    render(<OrgDashboard org={createTestOrg({ verification_status: "rejected" })} />);
    const badge = screen.getByText("Abgelehnt");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-[#EF4444]");
  });

  it("zeigt die drei Statistik-Karten", () => {
    render(<OrgDashboard org={createTestOrg()} />);
    expect(screen.getByText("Bewohner im Quartier")).toBeInTheDocument();
    expect(screen.getByText("Aktive Alerts")).toBeInTheDocument();
    expect(screen.getByText("Check-in-Quote")).toBeInTheDocument();
  });

  it("zeigt zugewiesene Quartiere (dedupliziert)", () => {
    render(<OrgDashboard org={createTestOrg()} />);
    expect(screen.getByText("Purkersdorfer Straße")).toBeInTheDocument();
    expect(screen.getByText("Sanarystraße")).toBeInTheDocument();
    expect(screen.getByText("Oberer Rebberg")).toBeInTheDocument();
  });

  it("zeigt 'Noch keine Quartiere' wenn keine zugewiesen", () => {
    render(
      <OrgDashboard
        org={createTestOrg({
          org_members: [{ id: "m-1", user_id: "u-1", role: "admin", assigned_quarters: [] }],
        })}
      />
    );
    expect(screen.getByText("Noch keine Quartiere zugewiesen.")).toBeInTheDocument();
  });

  it("zeigt Kontaktinformationen an", () => {
    render(<OrgDashboard org={createTestOrg()} />);
    expect(screen.getByText("info@sonnenschein.de")).toBeInTheDocument();
    expect(screen.getByText("+49 7761 12345")).toBeInTheDocument();
  });

  it("zeigt Gemeinde als Typ-Label fuer municipality", () => {
    render(<OrgDashboard org={createTestOrg({ type: "municipality" })} />);
    expect(screen.getByText("Gemeinde")).toBeInTheDocument();
  });

  it("zeigt Wohnungsbau als Typ-Label fuer housing", () => {
    render(<OrgDashboard org={createTestOrg({ type: "housing" })} />);
    expect(screen.getByText("Wohnungsbau")).toBeInTheDocument();
  });
});

describe("OrgMemberList", () => {
  // Mock fetch fuer Mitglieder-API
  const mockMembers = [
    {
      id: "m-1",
      org_id: "org-1",
      user_id: "u-1",
      role: "admin",
      assigned_quarters: ["Purkersdorfer Straße"],
      created_at: "2026-01-01T00:00:00Z",
      user: { id: "u-1", display_name: "Anna Mueller", email_hash: null },
    },
  ];

  it("zeigt 'Mitglied hinzufügen' Button fuer Admins", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    } as Response);

    render(<OrgMemberList orgId="org-1" currentUserRole="admin" />);

    // Warten bis geladen
    const button = await screen.findByText("Mitglied hinzufügen");
    expect(button).toBeInTheDocument();
  });

  it("zeigt KEINEN 'Mitglied hinzufügen' Button fuer Viewer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockMembers,
    } as Response);

    render(<OrgMemberList orgId="org-1" currentUserRole="viewer" />);

    // Warten bis Mitgliedername sichtbar
    await screen.findByText("Anna Mueller");

    // Button darf nicht existieren
    expect(screen.queryByText("Mitglied hinzufügen")).not.toBeInTheDocument();
  });
});
