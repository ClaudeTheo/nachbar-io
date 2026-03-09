// Nachbar.io — Tests fuer Admin Health-Check API
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// Supabase Server Client Mock
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

// Env-Variablen setzen
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
  vi.stubEnv("VAPID_PRIVATE_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("CRON_SECRET", "");
});

describe("GET /api/admin/health", () => {
  it("gibt 401 zurueck ohne Authentifizierung", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Nicht autorisiert");
  });

  it("gibt 403 zurueck fuer Nicht-Admins", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

    // Chainable Query: from().select().eq().single()
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { is_admin: false },
        }),
      }),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Nur Admins");
  });

  it("gibt 200 mit Health-Checks fuer Admins zurueck", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-123" } } });

    // Admin-Check: is_admin = true
    // Nachfolgende Queries: verschiedene Tabellen
    const chainableQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_admin: true } }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    mockSelect.mockReturnValue(chainableQuery);

    const response = await GET();

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("overall");
    expect(body).toHaveProperty("checks");
    expect(body).toHaveProperty("timestamp");
    expect(Array.isArray(body.checks)).toBe(true);
  });
});
