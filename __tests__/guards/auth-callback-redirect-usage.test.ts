// __tests__/guards/auth-callback-redirect-usage.test.ts
// Statischer Guard: `/auth/callback` soll Redirect-URLs zentral bauen.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const routePath = join(process.cwd(), "app/auth/callback/route.ts");

describe("auth callback redirect guard", () => {
  it("nutzt den zentralen Safe-Redirect-Builder fuer den next-Parameter", () => {
    const source = readFileSync(routePath, "utf8");

    expect(source).toContain("@/lib/auth/safe-redirect-url");
    expect(source).toContain("buildSafeRedirectUrl");
  });

  it("verbietet direkte origin+next Redirect-Sinks im Auth-Callback", () => {
    const source = readFileSync(routePath, "utf8");
    const forbiddenPatterns = [
      /NextResponse\.redirect\(\s*`[^`]*\$\{origin\}\$\{next\}[^`]*`\s*\)/,
      /NextResponse\.redirect\(\s*origin\s*\+\s*next\s*\)/,
      /NextResponse\.redirect\(\s*new URL\(\s*next\s*,\s*origin\s*\)\s*\)/,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
});
