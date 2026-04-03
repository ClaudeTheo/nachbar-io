// __tests__/api/hilfe/requests.test.ts
// Nachbar Hilfe — Tests fuer Hilfe-Gesuche API (GET + POST)

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRouteMockSupabase } from "@/lib/care/__tests__/mock-supabase";
import type { NextRequest } from "next/server";

const mockSupabase = createRouteMockSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mockSupabase.supabase)),
}));

function makeGetRequest(
  url = "http://localhost/api/hilfe/requests",
): NextRequest {
  const req = new Request(url, { method: "GET" });
  // nextUrl ist ein Next.js-spezifisches Property — manuell setzen
  Object.defineProperty(req, "nextUrl", { value: new URL(url) });
  return req as unknown as NextRequest;
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new Request("http://localhost/api/hilfe/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("/api/hilfe/requests", () => {
  beforeEach(() => {
    mockSupabase.reset();
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("gibt 401 zurueck ohne Authentifizierung", async () => {
      const { GET } = await import("@/app/api/hilfe/requests/route");
      const response = await GET(makeGetRequest());
      expect(response.status).toBe(401);
    });

    it("gibt Array von Gesuchen zurueck", async () => {
      mockSupabase.setUser({ id: "user-1", email: "test@test.de" });
      mockSupabase.addResponse("help_requests", {
        data: [
          { id: "req-1", type: "need", category: "shopping", title: "Einkaufen gesucht", status: "active" },
          { id: "req-2", type: "need", category: "garden", title: "Garten gesucht", status: "active" },
        ],
        error: null,
      });

      const { GET } = await import("@/app/api/hilfe/requests/route");
      const response = await GET(makeGetRequest());
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    it("filtert nach quarter_id", async () => {
      mockSupabase.setUser({ id: "user-2", email: "filter@test.de" });
      mockSupabase.addResponse("help_requests", {
        data: [
          {
            id: "req-3",
            type: "need",
            category: "tech",
            title: "Technik gesucht",
            status: "active",
            quarter_id: "q-1",
          },
        ],
        error: null,
      });

      const { GET } = await import("@/app/api/hilfe/requests/route");
      const response = await GET(
        makeGetRequest("http://localhost/api/hilfe/requests?quarter_id=q-1"),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0].quarter_id).toBe("q-1");
    });
  });

  describe("POST", () => {
    it("erstellt Hilfe-Gesuch mit gueltigen Daten (201)", async () => {
      mockSupabase.setUser({ id: "user-3", email: "resident@test.de" });
      mockSupabase.addResponse("help_requests", {
        data: {
          id: "req-new",
          user_id: "user-3",
          quarter_id: "q-1",
          type: "need",
          category: "shopping",
          title: "Einkaufen gesucht",
          status: "active",
        },
        error: null,
      });

      const { POST } = await import("@/app/api/hilfe/requests/route");
      const response = await POST(
        makePostRequest({
          quarter_id: "q-1",
          category: "shopping",
          title: "Einkaufen gesucht",
          description: "Brauche Hilfe beim Einkaufen",
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.category).toBe("shopping");
      expect(body.quarter_id).toBe("q-1");
    });

    it("lehnt ungueltige Kategorie ab (400)", async () => {
      mockSupabase.setUser({ id: "user-4", email: "bad@test.de" });

      const { POST } = await import("@/app/api/hilfe/requests/route");
      const response = await POST(
        makePostRequest({
          quarter_id: "q-1",
          category: "tanzen",
        }),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Ungueltige Kategorie");
    });

    it("lehnt fehlendes quarter_id ab (400)", async () => {
      mockSupabase.setUser({ id: "user-5", email: "noq@test.de" });

      const { POST } = await import("@/app/api/hilfe/requests/route");
      const response = await POST(
        makePostRequest({
          category: "shopping",
        }),
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("quarter_id");
    });
  });
});
