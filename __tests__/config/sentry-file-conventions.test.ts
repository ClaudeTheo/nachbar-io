import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const projectRoot = process.cwd();

describe("Sentry file conventions", () => {
  test("uses Next.js instrumentation-client convention for browser Sentry init", () => {
    const instrumentationClientPath = join(
      projectRoot,
      "instrumentation-client.ts",
    );
    const deprecatedClientConfigPath = join(
      projectRoot,
      "sentry.client.config.ts",
    );

    expect(existsSync(instrumentationClientPath)).toBe(true);
    expect(existsSync(deprecatedClientConfigPath)).toBe(false);

    const instrumentationClient = readFileSync(
      instrumentationClientPath,
      "utf8",
    );

    expect(instrumentationClient).toContain('from "@sentry/nextjs"');
    expect(instrumentationClient).toContain("Sentry.init");
    expect(instrumentationClient).toContain("beforeSend");
    expect(instrumentationClient).toContain("onRouterTransitionStart");
    expect(instrumentationClient).toContain("Sentry.captureRouterTransitionStart");
  });
});
