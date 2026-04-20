#!/usr/bin/env node
// Startet next dev mit geladener .env.cloud.local.
// Grund: Next.js laedt .env.local IMMER. Um im Cloud-Mode zu arbeiten, muessen
// die Cloud-Keys via Shell-Environment vorab gesetzt werden — die gewinnen
// laut Next.js-Precedence-Regel gegen die Werte in .env.local.
// Siehe: https://nextjs.org/docs/app/guides/environment-variables

import { config } from "dotenv";
import { spawn } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

const cloudEnvPath = resolve(process.cwd(), ".env.cloud.local");

if (!existsSync(cloudEnvPath)) {
  console.error("[dev:cloud] FEHLT: .env.cloud.local");
  console.error(
    "[dev:cloud] Hinweis: Lege die Datei an (Kopie der alten .env.local)."
  );
  process.exit(1);
}

const result = config({ path: cloudEnvPath, override: true });
if (result.error) {
  console.error("[dev:cloud] Konnte .env.cloud.local nicht laden:", result.error);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "(unset)";
console.log(`[dev:cloud] Supabase-Ziel: ${supabaseUrl}`);
if (supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost")) {
  console.warn(
    "[dev:cloud] WARNUNG: Supabase-URL zeigt auf lokale Adresse trotz Cloud-Mode."
  );
}

const nextCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(nextCmd, ["next", "dev", "--webpack"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error("[dev:cloud] Spawn-Fehler:", err);
  process.exit(1);
});
