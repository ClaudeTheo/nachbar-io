// Nachbar.io — Vitest Setup (beide Projekte: node + dom)
// Sichere Dummy-ENV-Werte, damit Tests nie gegen echte Dienste laufen.
// Setzt nur Werte, die noch nicht definiert sind.

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
