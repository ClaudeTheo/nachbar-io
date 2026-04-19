// __tests__/components/senior/gedaechtnis-page.test.tsx
// Welle C C7 — Senior-Memory-Uebersichts-Page (DSGVO Art. 15 + 17).
//
// Testet die Komposition aus useMemoryFacts + SeniorMemoryFactList +
// Consent-Toggle-API. useMemoryFacts wird gemockt, damit Tests deterministisch
// ohne fetch laufen.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GedaechtnisPage from "@/app/(senior)/profil/gedaechtnis/page";
import type { MemoryFact, MemoryConsent } from "@/modules/memory/types";

// --- useMemoryFacts mock --------------------------------------------------
const factsState: {
  current: {
    facts: MemoryFact[];
    consents: MemoryConsent[];
    loading: boolean;
    error: string | null;
    deleteFact: ReturnType<typeof vi.fn>;
    updateFact: ReturnType<typeof vi.fn>;
    resetFacts: ReturnType<typeof vi.fn>;
    reload: ReturnType<typeof vi.fn>;
  };
} = {
  current: {
    facts: [],
    consents: [],
    loading: false,
    error: null,
    deleteFact: vi.fn(),
    updateFact: vi.fn(),
    resetFacts: vi.fn(),
    reload: vi.fn(),
  },
};

vi.mock("@/modules/memory/hooks/useMemoryFacts", () => ({
  useMemoryFacts: () => factsState.current,
}));

// --- fetch mock fuer Consent-Toggles --------------------------------------
const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));

beforeEach(() => {
  vi.clearAllMocks();
  factsState.current = {
    facts: [],
    consents: [],
    loading: false,
    error: null,
    deleteFact: vi.fn(),
    updateFact: vi.fn(),
    resetFacts: vi.fn(),
    reload: vi.fn(),
  };
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockClear();
});

afterEach(() => cleanup());

const sampleFact: MemoryFact = {
  id: "f1",
  user_id: "u1",
  category: "preference",
  consent_level: "basis",
  key: "tee",
  value: "Pfefferminz",
  value_encrypted: false,
  visibility: "private",
  org_id: null,
  source: "self",
  source_user_id: "u1",
  confidence: null,
  confirmed: true,
  created_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-01T10:00:00Z",
};

describe("Senior-Gedaechtnis-Page", () => {
  it("zeigt Titel 'Mein Gedaechtnis'", () => {
    render(<GedaechtnisPage />);
    expect(
      screen.getByRole("heading", { name: /mein gedaechtnis/i }),
    ).toBeInTheDocument();
  });

  it("zeigt DSGVO-Hinweistext (Auskunft + Loeschung)", () => {
    render(<GedaechtnisPage />);
    expect(
      screen.getByText(
        /sehen.*loeschen|jeden eintrag.*loeschen|recht.*loeschen/i,
      ),
    ).toBeInTheDocument();
  });

  it("zeigt Loading-Zustand wenn loading=true", () => {
    factsState.current = { ...factsState.current, loading: true };
    render(<GedaechtnisPage />);
    expect(screen.getByText(/wird geladen|laed/i)).toBeInTheDocument();
  });

  it("delegiert facts an SeniorMemoryFactList (Wert sichtbar)", () => {
    factsState.current = {
      ...factsState.current,
      facts: [sampleFact],
    };
    render(<GedaechtnisPage />);
    expect(screen.getByText("Pfefferminz")).toBeInTheDocument();
  });

  it("ruft deleteFact mit der ID nach Confirm", async () => {
    const deleteFact = vi.fn();
    factsState.current = {
      ...factsState.current,
      facts: [sampleFact],
      deleteFact,
    };
    const user = userEvent.setup();
    render(<GedaechtnisPage />);

    await user.click(
      screen.getByRole("button", { name: /pfefferminz loeschen/i }),
    );
    await user.click(screen.getByRole("button", { name: /ja.*loeschen/i }));

    expect(deleteFact).toHaveBeenCalledWith("f1");
  });

  it("zeigt 3 Consent-Toggles (Basis, Pflege, Persoenlich)", () => {
    render(<GedaechtnisPage />);
    expect(
      screen.getByRole("button", { name: /basis|profil.*routinen/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /pflege|alltag/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /persoenlich|private notizen/i }),
    ).toBeInTheDocument();
  });

  it("Toggle ruft /api/memory/consent/grant wenn nicht erteilt", async () => {
    const user = userEvent.setup();
    render(<GedaechtnisPage />);
    await user.click(
      screen.getByRole("button", { name: /basis|profil.*routinen/i }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/memory/consent/grant",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("Toggle ruft /api/memory/consent/revoke wenn bereits erteilt", async () => {
    factsState.current = {
      ...factsState.current,
      consents: [
        {
          id: "c1",
          user_id: "u1",
          consent_type: "memory_basis",
          granted: true,
          granted_at: "2026-04-01T10:00:00Z",
          granted_by: "u1",
          revoked_at: null,
        },
      ],
    };
    const user = userEvent.setup();
    render(<GedaechtnisPage />);

    await user.click(
      screen.getByRole("button", { name: /basis|profil.*routinen/i }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/memory/consent/revoke",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("zeigt Footer mit Anzahl 'X von 70 Eintraegen'", () => {
    factsState.current = {
      ...factsState.current,
      facts: [sampleFact],
    };
    render(<GedaechtnisPage />);
    expect(screen.getByText(/1.*von.*70|70.*eintraegen/i)).toBeInTheDocument();
  });

  it("Senior-Mode: Consent-Toggle hat min-height 80px", () => {
    render(<GedaechtnisPage />);
    const toggle = screen.getByRole("button", {
      name: /basis|profil.*routinen/i,
    });
    expect(toggle.style.minHeight).toBe("80px");
  });
});
