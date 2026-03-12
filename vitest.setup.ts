// Nachbar.io — Vitest Setup
// Globale Mocks und Matcher fuer alle Tests

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import React from "react";

// Test-Encryption-Key fuer care/crypto Tests (32 Bytes = 64 Hex-Zeichen)
process.env.CARE_ENCRYPTION_KEY = process.env.CARE_ENCRYPTION_KEY || "0".repeat(64);

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
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement("a", { href, ...props }, children),
}));

// Next.js Image als <img> rendern
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props),
}));
