import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryFactList } from "@/modules/memory/components/MemoryFactList";
import type { MemoryFact } from "@/modules/memory/types";

const mockFacts: MemoryFact[] = [
  {
    id: "1",
    user_id: "u1",
    category: "profile",
    consent_level: "basis",
    key: "name",
    value: "Frau Müller",
    value_encrypted: false,
    visibility: "private",
    org_id: null,
    source: "self",
    source_user_id: "u1",
    confidence: null,
    confirmed: true,
    created_at: "2026-03-30T10:00:00Z",
    updated_at: "2026-03-30T10:00:00Z",
  },
  {
    id: "2",
    user_id: "u1",
    category: "routine",
    consent_level: "basis",
    key: "morgen_kaffee",
    value: "Trinkt jeden Morgen um 8 Uhr Kaffee",
    value_encrypted: false,
    visibility: "private",
    org_id: null,
    source: "ai_learned",
    source_user_id: "u1",
    confidence: 0.9,
    confirmed: false,
    created_at: "2026-03-30T10:00:00Z",
    updated_at: "2026-03-30T10:00:00Z",
  },
];

describe("MemoryFactList", () => {
  it("zeigt Fakten gruppiert nach Kategorie", () => {
    render(
      <MemoryFactList
        facts={mockFacts}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Profil").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Routinen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Frau Müller").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Trinkt jeden Morgen/).length).toBeGreaterThan(
      0,
    );
  });

  it("zeigt Quell-Badge", () => {
    render(
      <MemoryFactList
        facts={mockFacts}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Selbst").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KI gelernt").length).toBeGreaterThan(0);
  });

  it("zeigt Unbestaetigt-Badge fuer KI-gelernte Fakten", () => {
    render(
      <MemoryFactList
        facts={mockFacts}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Unbestätigt").length).toBeGreaterThan(0);
  });

  it("zeigt Leer-Zustand ohne Fakten", () => {
    render(
      <MemoryFactList
        facts={[]}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Noch keine Einträge").length).toBeGreaterThan(
      0,
    );
  });

  it("zeigt Reset-Dialog bei Klick auf Loeschen-Button", () => {
    render(
      <MemoryFactList
        facts={mockFacts}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const deleteButtons = screen.getAllByRole("button", {
      name: /Alle Einträge löschen/,
    });
    fireEvent.click(deleteButtons[0]);
    expect(
      screen.getAllByText("Welche Einträge möchten Sie löschen?").length,
    ).toBeGreaterThan(0);
  });
});
