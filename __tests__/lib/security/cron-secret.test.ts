import { describe, expect, it } from "vitest";
import {
  verifyCronSecret,
  verifyCronSecretValue,
} from "@/lib/security/cron-secret";

describe("cron secret verification", () => {
  it("akzeptiert nur exakt passende Bearer-Header", () => {
    expect(verifyCronSecret("Bearer test-cron-secret", "test-cron-secret")).toBe(
      true,
    );

    expect(verifyCronSecret("Bearer wrong-secret", "test-cron-secret")).toBe(
      false,
    );
    expect(verifyCronSecret("Bearer test-cron-secret ", "test-cron-secret")).toBe(
      false,
    );
    expect(verifyCronSecret("Basic test-cron-secret", "test-cron-secret")).toBe(
      false,
    );
    expect(verifyCronSecret(null, "test-cron-secret")).toBe(false);
  });

  it("blockiert fail-closed wenn CRON_SECRET fehlt", () => {
    expect(verifyCronSecret("Bearer anything", "")).toBe(false);
    expect(verifyCronSecret("Bearer anything", undefined)).toBe(false);
    expect(verifyCronSecretValue("anything", "")).toBe(false);
  });

  it("vergleicht auch interne Secret-Header ohne Bearer-Praefix", () => {
    expect(verifyCronSecretValue("test-cron-secret", "test-cron-secret")).toBe(
      true,
    );
    expect(verifyCronSecretValue("wrong", "test-cron-secret")).toBe(false);
    expect(verifyCronSecretValue(null, "test-cron-secret")).toBe(false);
  });
});
