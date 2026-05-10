// lib/security/founder-bypass.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { isFounderRequest, readUserIdFromCookie } from "./founder-bypass";

const FOUNDER_USER_ID = "dbd5e23e-9b72-47d0-86f9-58e0faaf8ddd";
const STRANGER_USER_ID = "11111111-2222-3333-4444-555555555555";
const PROJECT_REF = "uylszchlyhbpbmslcnka";
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

function makeJwt(sub: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payload = btoa(JSON.stringify({ sub, exp: 9999999999 }))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payload}.fakesig`;
}

function makeRequest(cookieValue?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieValue) headers.cookie = `${COOKIE_NAME}=${cookieValue}`;
  return new NextRequest("http://localhost/api/x", { headers });
}

describe("founder-bypass", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("readUserIdFromCookie: liest sub aus Array-Cookie", () => {
    const cookie = encodeURIComponent(
      JSON.stringify([makeJwt(FOUNDER_USER_ID), "refresh"]),
    );
    expect(readUserIdFromCookie(makeRequest(cookie))).toBe(FOUNDER_USER_ID);
  });

  it("readUserIdFromCookie: liest sub aus Object-Cookie (access_token)", () => {
    const cookie = encodeURIComponent(
      JSON.stringify({ access_token: makeJwt(FOUNDER_USER_ID) }),
    );
    expect(readUserIdFromCookie(makeRequest(cookie))).toBe(FOUNDER_USER_ID);
  });

  it("readUserIdFromCookie: gibt null bei fehlendem Cookie", () => {
    expect(readUserIdFromCookie(makeRequest())).toBeNull();
  });

  it("readUserIdFromCookie: gibt null bei kaputtem JWT", () => {
    const cookie = encodeURIComponent(JSON.stringify(["nicht-jwt"]));
    expect(readUserIdFromCookie(makeRequest(cookie))).toBeNull();
  });

  it("isFounderRequest: true fuer Founder-User-ID", () => {
    const cookie = encodeURIComponent(
      JSON.stringify([makeJwt(FOUNDER_USER_ID), "r"]),
    );
    expect(isFounderRequest(makeRequest(cookie))).toBe(true);
  });

  it("isFounderRequest: false fuer Fremde User-ID", () => {
    const cookie = encodeURIComponent(
      JSON.stringify([makeJwt(STRANGER_USER_ID), "r"]),
    );
    expect(isFounderRequest(makeRequest(cookie))).toBe(false);
  });

  it("isFounderRequest: false ohne Cookie", () => {
    expect(isFounderRequest(makeRequest())).toBe(false);
  });

  it("isFounderRequest: false wenn NEXT_PUBLIC_SUPABASE_URL fehlt", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const cookie = encodeURIComponent(
      JSON.stringify([makeJwt(FOUNDER_USER_ID), "r"]),
    );
    expect(isFounderRequest(makeRequest(cookie))).toBe(false);
  });
});
