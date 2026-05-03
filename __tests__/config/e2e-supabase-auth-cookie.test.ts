import { describe, expect, it } from "vitest";
import {
  buildSupabaseSessionCookies,
  getSupabaseStorageKey,
} from "@/tests/e2e/helpers/supabase-auth-cookie";

describe("E2E Supabase SSR auth cookies", () => {
  it("leitet den lokalen Supabase Storage-Key aus der URL ab", () => {
    expect(getSupabaseStorageKey("http://127.0.0.1:54321")).toBe(
      "sb-127-auth-token",
    );
  });

  it("kodiert Session-Cookies im base64url-Format fuer @supabase/ssr", () => {
    const [{ value }] = buildSupabaseSessionCookies({
      storageKey: "sb-127-auth-token",
      sessionJson: JSON.stringify({ token: "\u00fb\u00ff\u00ff" }),
      currentUrl: "http://localhost:3000/login",
    });

    expect(value.startsWith("base64-")).toBe(true);
    expect(value.slice("base64-".length)).not.toMatch(/[+/=]/);
    expect(
      Buffer.from(value.slice("base64-".length), "base64url").toString(
        "utf8",
      ),
    ).toBe(JSON.stringify({ token: "\u00fb\u00ff\u00ff" }));
  });

  it("splittet grosse Session-Cookies in SSR-kompatible Chunks", () => {
    const cookies = buildSupabaseSessionCookies({
      storageKey: "sb-127-auth-token",
      sessionJson: JSON.stringify({ token: "x".repeat(8_000) }),
      currentUrl: "http://localhost:3000/login",
    });

    expect(cookies.length).toBeGreaterThan(1);
    expect(cookies[0].name).toBe("sb-127-auth-token.0");
    expect(cookies.every((cookie) => cookie.value.length <= 3180)).toBe(true);
  });
});
