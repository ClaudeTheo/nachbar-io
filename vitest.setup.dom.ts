// Nachbar.io — Vitest Setup (nur dom-Projekt, jsdom)
// Globale DOM-Mocks und Matcher; ENV-Werte liegen in vitest.setup.env.ts.

import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

// Globales DOM-Cleanup nach jedem Test (RTL-Standard). Ohne globals:true
// registriert Vitest kein automatisches Cleanup; ohne diesen Hook akkumuliert
// das jsdom-DOM innerhalb einer Datei (RAM + langsamere Queries). Idempotent,
// also unschaedlich fuer Tests mit eigenem afterEach(cleanup).
afterEach(() => {
  cleanup();
});

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
