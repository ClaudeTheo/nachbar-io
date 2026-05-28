// Nachbar.io — Vitest Setup
// Globale Mocks und Matcher fuer alle Tests

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

const envKey = (...parts: string[]) => parts.join("_");

const safeTestEnv: Record<string, string> = {
  NODE_ENV: "test",
  [envKey("NEXT", "PUBLIC", "SUPABASE", "URL")]: "http://127.0.0.1:54321",
  [envKey("NEXT", "PUBLIC", "SUPABASE", "ANON", "KEY")]:
    "sb-local-anon-test-key",
  [envKey("SUPABASE", "SERVICE", "ROLE", "KEY")]:
    "sb-local-service-role-test-key",
  [envKey("CARE", "ENCRYPTION", "KEY")]: "0".repeat(64),
  [envKey("RESIDENT", "HASH", "SECRET")]: "resident-hash-test-secret",
  [envKey("INTERNAL", "API", "SECRET")]: "internal-api-test-secret",
  [envKey("E2E", "TEST", "SECRET")]: "e2e-test-secret-dev",
  [envKey("ANTHROPIC", "API", "KEY")]: "",
  [envKey("OPENAI", "API", "KEY")]: "",
  [envKey("GOOGLE", "AI", "API", "KEY")]: "",
  [envKey("RESEND", "API", "KEY")]: "",
  [envKey("STRIPE", "SECRET", "KEY")]: "",
  [envKey("TWILIO", "AUTH", "TOKEN")]: "",
  [envKey("VERCEL", "TOKEN")]: "",
  [envKey("UPSTASH", "REDIS", "REST", "TOKEN")]: "",
};

for (const [key, value] of Object.entries(safeTestEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

// IntersectionObserver Mock (fuer LargeTitle und andere Observer-Components)
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
  constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {}
}
globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Next.js Navigation Mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Next.js Link als einfaches <a> rendern
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

// Next.js Image als <img> rendern
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props),
}));
