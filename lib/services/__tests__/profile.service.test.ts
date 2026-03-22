// Tests fuer den Profil-Service
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase-Client mocken
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle, eq: vi.fn(() => ({ single: mockSingle })) }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }));
const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

import { getProfile, updateProfile, toggleUiMode, updateUserSettings } from "../profile.service";

const MOCK_USER = {
  id: "user-1",
  email_hash: "abc",
  display_name: "Max Mustermann",
  avatar_url: null,
  bio: "Hallo",
  phone: null,
  ui_mode: "active" as const,
  trust_level: "verified" as const,
  is_admin: false,
  created_at: "2026-01-01T00:00:00Z",
  last_seen: "2026-03-20T10:00:00Z",
  settings: {},
};

describe("getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laedt Profil ueber users-Tabelle mit userId", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
    };
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof mockFrom>);

    const result = await getProfile("user-1");
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toEqual(MOCK_USER);
  });

  it("wirft Fehler wenn Profil nicht gefunden", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
    };
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof mockFrom>);

    await expect(getProfile("unknown")).rejects.toEqual({ message: "Not found" });
  });
});

describe("updateProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aktualisiert Profil-Felder und gibt aktualisiertes Profil zurueck", async () => {
    const updated = { ...MOCK_USER, display_name: "Neuer Name" };
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof mockFrom>);

    const result = await updateProfile("user-1", { display_name: "Neuer Name" });
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(chain.update).toHaveBeenCalledWith({ display_name: "Neuer Name" });
    expect(chain.eq).toHaveBeenCalledWith("id", "user-1");
    expect(result.display_name).toBe("Neuer Name");
  });

  it("wirft Fehler bei fehlgeschlagenem Update", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } }),
    };
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof mockFrom>);

    await expect(updateProfile("user-1", { bio: "x" })).rejects.toEqual({ message: "Update failed" });
  });
});

describe("toggleUiMode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wechselt von active zu senior", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...MOCK_USER, ui_mode: "senior" }, error: null }),
    };
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof mockFrom>);

    const result = await toggleUiMode("user-1", "active");
    expect(result).toBe("senior");
  });

  it("wechselt von senior zu active", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...MOCK_USER, ui_mode: "active" }, error: null }),
    };
    mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof mockFrom>);

    const result = await toggleUiMode("user-1", "senior");
    expect(result).toBe("active");
  });
});

describe("updateUserSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("merged neue Settings mit bestehenden", async () => {
    // Erster Aufruf: aktuelle Settings laden
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { settings: { theme: "dark" } }, error: null }),
    };
    // Zweiter Aufruf: Update mit gemerged Settings
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...MOCK_USER, settings: { theme: "dark", lang: "de" } },
        error: null,
      }),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain as unknown as ReturnType<typeof mockFrom>;
      return updateChain as unknown as ReturnType<typeof mockFrom>;
    });

    const result = await updateUserSettings("user-1", { lang: "de" });
    expect(result.settings).toEqual({ theme: "dark", lang: "de" });
  });
});
