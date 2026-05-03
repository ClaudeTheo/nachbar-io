import { describe, expect, it } from "vitest";

import {
  detectLocalhostPreflightProblems,
  isLocalhostE2eBaseUrl,
} from "@/scripts/e2e-localhost-preflight.mjs";

describe("E2E localhost preflight", () => {
  it("runs only for localhost E2E base URLs", () => {
    expect(isLocalhostE2eBaseUrl(undefined)).toBe(true);
    expect(isLocalhostE2eBaseUrl("http://localhost:3001")).toBe(true);
    expect(isLocalhostE2eBaseUrl("https://nachbar-io.vercel.app")).toBe(false);
  });

  it("blocks reused localhost servers that point at Cloud Supabase", () => {
    const problems = detectLocalhostPreflightProblems([
      {
        port: 3000,
        processId: 4711,
        commandLine:
          "node --env-file=.env.cloud-current.local ./node_modules/next/dist/bin/next dev --webpack",
      },
    ]);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Port 3000");
    expect(problems[0]).toContain(".env.cloud-current.local");
  });

  it("allows explicit local Supabase servers on localhost", () => {
    expect(
      detectLocalhostPreflightProblems([
        {
          port: 3001,
          processId: 4812,
          commandLine:
            "node scripts/start-local-production.mjs start -p 3001 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
        },
      ]),
    ).toEqual([]);
  });
});
