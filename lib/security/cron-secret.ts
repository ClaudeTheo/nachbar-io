import { createHash, timingSafeEqual } from "crypto";

const BEARER_PREFIX = "Bearer ";

export function verifyCronSecret(
  authHeader: string | null,
  expectedSecret = process.env.CRON_SECRET,
): boolean {
  if (!authHeader?.startsWith(BEARER_PREFIX)) return false;
  return verifyCronSecretValue(authHeader.slice(BEARER_PREFIX.length), expectedSecret);
}

export function verifyCronSecretValue(
  value: string | null,
  expectedSecret = process.env.CRON_SECRET,
): boolean {
  if (!value || !expectedSecret) return false;

  try {
    return timingSafeEqual(hash(value), hash(expectedSecret));
  } catch {
    return false;
  }
}

function hash(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
