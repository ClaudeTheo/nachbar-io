// lib/quarters/__tests__/hooks.test.ts
// Unit-Tests fuer Multi-Quartier React Hooks

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserRole } from "../hooks";

// Mock des Supabase-Clients
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// getCachedUser Mock: leitet direkt an mockGetUser weiter (kein Cache im Test)
vi.mock("@/lib/supabase/cached-auth", () => ({
  getCachedUser: vi.fn(async (supabase: { auth: { getUser: () => Promise<{ data: { user: unknown }; error: unknown }> } }) => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  }),
  invalidateUserCache: vi.fn(),
}));

describe("useUserRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gibt Default-Rolle 'user' zurueck und loading ist initial true", () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.role).toBe("user");
    expect(result.current.loading).toBe(true);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isQuarterAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("setzt loading auf false nach dem Laden", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("erkennt super_admin korrekt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: "super_admin" },
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("super_admin");
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.isQuarterAdmin).toBe(false);
    expect(result.current.isAdmin).toBe(true);
  });

  it("erkennt quarter_admin korrekt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "qadmin-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: "quarter_admin" },
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("quarter_admin");
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.isQuarterAdmin).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it("bleibt bei 'user' wenn kein Nutzer eingeloggt ist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("user");
    expect(result.current.isAdmin).toBe(false);
  });

  it("bleibt bei 'user' wenn DB keine Rolle zurueckgibt", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: null },
      error: null,
    });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // role bleibt auf dem Default "user" weil data.role falsy ist
    expect(result.current.role).toBe("user");
  });
});
