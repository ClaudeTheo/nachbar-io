import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";

// Welle SB-3: GET /api/senior/photos liefert die Familienfotos des eigenen
// Haushalts (RLS-scoped via SB-1) als ARRAY (nie { items }) mit Signed-URLs.

const mockSupabase = createRouteMockSupabase();
const getSeniorHouseholdPhotosMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

vi.mock("@/modules/care/services/senior-kiosk.service", () => ({
  getSeniorHouseholdPhotos: (...args: unknown[]) =>
    getSeniorHouseholdPhotosMock(...args),
}));

describe("GET /api/senior/photos", () => {
  beforeEach(() => {
    mockSupabase.reset();
    getSeniorHouseholdPhotosMock.mockReset();
  });

  it("gibt 401 ohne Login zurueck und ruft den Service nicht auf", async () => {
    const { GET } = await import("@/app/api/senior/photos/route");
    const res = await GET();
    expect(res.status).toBe(401);
    expect(getSeniorHouseholdPhotosMock).not.toHaveBeenCalled();
  });

  it("liefert ein Array (nie { items }) und laesst Fotos ohne Signed-URL weg", async () => {
    mockSupabase.setUser({ id: "u-senior", email: "senior@test.invalid" });
    getSeniorHouseholdPhotosMock.mockResolvedValue([
      {
        id: "p1",
        url: "https://signed/1.jpg",
        caption: "Geburtstag",
        uploaderId: "x",
        createdAt: "t1",
        pinned: true,
      },
      {
        id: "p2",
        url: null,
        caption: "ohne url",
        uploaderId: "y",
        createdAt: "t2",
        pinned: false,
      },
    ]);

    const { GET } = await import("@/app/api/senior/photos/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual({
      id: "p1",
      url: "https://signed/1.jpg",
      caption: "Geburtstag",
    });
  });
});
