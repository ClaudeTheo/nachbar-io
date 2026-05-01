import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const localEnv = readFileSync(join(repoRoot, ".env.local"), "utf8");
const supabaseConfig = readFileSync(join(repoRoot, "supabase", "config.toml"), "utf8");
const apiPortMatch = supabaseConfig.match(/^\s*port\s*=\s*(\d+)\s*$/m);
const apiPort = apiPortMatch?.[1] ?? "54321";

for (const line of localEnv.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) continue;

  const [, key, rawValue] = match;
  const value = rawValue.trim().replace(/^["']|["']$/g, "");
  process.env[key] = value;
}

process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${apiPort}`;

const nextBin = join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const nextArgs = process.argv.slice(2);
const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
