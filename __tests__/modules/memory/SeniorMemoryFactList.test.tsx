// __tests__/modules/memory/SeniorMemoryFactList.test.tsx
// Welle C C7 — Senior-Variante der Memory-Fakten-Liste.
//
// Unterschiede zur Standard-MemoryFactList:
// - 80px Touch-Targets pro Loesch-Aktion (Senior-Mode)
// - DSGVO-konformer Confirm-Overlay vor JEDEM Delete + vor Reset-All
//   (statt inline-toggle wie beim Standard-User-Layout)
// - KEINE Inline-Edit-Funktion (Senior soll nur sehen + loeschen, nicht editieren)
// - Reset-Scope vereinfacht: nur "alles loeschen", keine 3-Wege-Auswahl
// - Anthrazit/Gruen statt muted-foreground (Kontrast 4.5:1)
//
// Wiederverwendet: useMemoryFacts (getrennt — Hook bleibt single-source-of-truth),
// MemoryFact-Type aus modules/memory/types.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SeniorMemoryFactList } from "@/modules/memory/components/SeniorMemoryFactList";
import type { MemoryFact } from "@/modules/memory/types";

afterEach(() => cleanup());

const mockFacts: MemoryFact[] = [
  {
    id: "f1",
    user_id: "u1",
    category: "profile",
    consent_level: "basis",
    key: "geburtstag",
    value: "12. Maerz 1942",
    value_encrypted: false,
    visibility: "private",
    org_id: null,
    source: "self",
    source_user_id: "u1",
    confidence: null,
    confirmed: true,
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "f2",
    user_id: "u1",
    category: "preference",
    consent_level: "basis",
    key: "lieblingstee",
    value: "Pfefferminz",
    value_encrypted: false,
    visibility: "private",
    org_id: null,
    source: "ai_learned",
    source_user_id: "u1",
    confidence: 0.9,
    confirmed: true,
    created_at: "2026-04-15T10:00:00Z",
    updated_at: "2026-04-15T10:00:00Z",
  },
];

describe("SeniorMemoryFactList", () => {
  describe("Anzeige", () => {
    it("rendert Leer-Zustand wenn keine facts", () => {
      render(
        <SeniorMemoryFactList
          facts={[]}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(
        screen.getByText(/noch keine eintraege|noch nichts gespeichert/i),
      ).toBeInTheDocument();
    });

    it("zeigt Werte aller facts an", () => {
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(screen.getByText("12. Maerz 1942")).toBeInTheDocument();
      expect(screen.getByText("Pfefferminz")).toBeInTheDocument();
    });

    // C8: Senior sieht Caregiver-Eintraege mit auffaelligem Provenance-Badge.
    // Ohne Name-Lookup in dieser Iteration — generisches Label "Von
    // Angehoerigen" reicht fuer die "voll transparent"-Architektur (2a).
    it("rendert 'Von Angehoerigen'-Badge bei source='caregiver' (C8)", () => {
      const caregiverFact = {
        ...mockFacts[0],
        id: "f-cg",
        source: "caregiver" as const,
        source_user_id: "cg-42",
        value: "Apfelstrudel",
      };
      render(
        <SeniorMemoryFactList
          facts={[caregiverFact]}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      // Badge explizit ueber role="note" identifizieren, damit der Test
      // nicht mit dem existierenden SOURCE_LABEL-Untertitel kollidiert.
      const badge = screen.getByText(/^von angehoerigen$/i);
      expect(badge).toBeInTheDocument();
    });

    it("rendert KEIN Provenance-Badge bei source='self' oder 'ai_learned'", () => {
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(screen.queryByText(/^von angehoerigen$/i)).toBeNull();
    });

    it("gruppiert nach Kategorie (Profil, Vorlieben, ...)", () => {
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(screen.getByText(/profil/i)).toBeInTheDocument();
      expect(screen.getByText(/vorlieben/i)).toBeInTheDocument();
    });

    it("zeigt Quell-Hinweis (Selbst / KI gelernt)", () => {
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(screen.getByText(/selbst/i)).toBeInTheDocument();
      expect(screen.getByText(/ki gelernt/i)).toBeInTheDocument();
    });
  });

  describe("Senior-Mode Touch-Targets", () => {
    it("Loesch-Button pro Eintrag hat min-height 80px", () => {
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      const deleteButtons = screen.getAllByRole("button", {
        name: /loeschen/i,
      });
      // Mindestens ein Button pro Eintrag mit 80px
      const itemDeletes = deleteButtons.filter(
        (b) => b.style.minHeight === "80px",
      );
      expect(itemDeletes.length).toBeGreaterThanOrEqual(mockFacts.length);
    });
  });

  describe("Einzel-Loeschen mit Confirm", () => {
    it("Klick auf Eintrags-Loesch-Button oeffnet Confirm-Overlay mit Wert + Frage", async () => {
      const user = userEvent.setup();
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      // Loesch-Button fuer 'Pfefferminz' finden (zweiter Eintrag).
      const triggers = screen.getAllByRole("button", {
        name: /pfefferminz loeschen|eintrag.*pfefferminz.*loeschen/i,
      });
      await user.click(triggers[0]);

      expect(
        screen.getByText(/wirklich loeschen|moechten sie diesen eintrag/i),
      ).toBeInTheDocument();
      // Wert ist im Dialog sichtbar (im Vorlieben-Block UND im Confirm)
      expect(screen.getAllByText("Pfefferminz").length).toBeGreaterThanOrEqual(
        2,
      );
    });

    it("Klick auf 'Ja, loeschen' im Confirm ruft onDelete mit der ID", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={onDelete}
          onResetAll={vi.fn()}
        />,
      );
      await user.click(
        screen.getAllByRole("button", {
          name: /pfefferminz loeschen|eintrag.*pfefferminz.*loeschen/i,
        })[0],
      );
      await user.click(screen.getByRole("button", { name: /ja.*loeschen/i }));
      expect(onDelete).toHaveBeenCalledWith("f2");
    });

    it("Klick auf 'Abbrechen' schliesst Confirm OHNE onDelete-Aufruf", async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={onDelete}
          onResetAll={vi.fn()}
        />,
      );
      await user.click(
        screen.getAllByRole("button", {
          name: /pfefferminz loeschen|eintrag.*pfefferminz.*loeschen/i,
        })[0],
      );
      await user.click(screen.getByRole("button", { name: /abbrechen/i }));
      expect(onDelete).not.toHaveBeenCalled();
      // Confirm-Frage verschwunden
      expect(
        screen.queryByText(/wirklich loeschen|moechten sie diesen eintrag/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Alle-Loeschen mit Confirm", () => {
    it("Bottom-Button 'Alle Eintraege loeschen' sichtbar wenn facts vorhanden", () => {
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(
        screen.getByRole("button", { name: /alle eintraege loeschen/i }),
      ).toBeInTheDocument();
    });

    it("Bottom-Button NICHT sichtbar wenn keine facts (Leer-Zustand)", () => {
      render(
        <SeniorMemoryFactList
          facts={[]}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      expect(
        screen.queryByRole("button", { name: /alle eintraege loeschen/i }),
      ).not.toBeInTheDocument();
    });

    it("Klick auf Reset-Button oeffnet Confirm-Overlay (Anzahl + Frage)", async () => {
      const user = userEvent.setup();
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      await user.click(
        screen.getByRole("button", { name: /alle eintraege loeschen/i }),
      );
      // Frage zeigt Anzahl
      expect(
        screen.getByText(/2 eintraege|alle 2 eintraege/i),
      ).toBeInTheDocument();
    });

    it("Klick auf 'Ja, alles loeschen' ruft onResetAll", async () => {
      const onResetAll = vi.fn();
      const user = userEvent.setup();
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={onResetAll}
        />,
      );
      await user.click(
        screen.getByRole("button", { name: /alle eintraege loeschen/i }),
      );
      await user.click(
        screen.getByRole("button", { name: /ja.*alles loeschen/i }),
      );
      expect(onResetAll).toHaveBeenCalledTimes(1);
    });

    it("Reset-Confirm hat 80px Touch-Targets fuer Ja/Abbrechen", async () => {
      const user = userEvent.setup();
      render(
        <SeniorMemoryFactList
          facts={mockFacts}
          onDelete={vi.fn()}
          onResetAll={vi.fn()}
        />,
      );
      await user.click(
        screen.getByRole("button", { name: /alle eintraege loeschen/i }),
      );
      const ja = screen.getByRole("button", { name: /ja.*alles loeschen/i });
      const ab = screen.getByRole("button", { name: /abbrechen/i });
      expect(ja.style.minHeight).toBe("80px");
      expect(ab.style.minHeight).toBe("80px");
    });
  });
});
