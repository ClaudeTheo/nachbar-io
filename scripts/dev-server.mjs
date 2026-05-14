#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readArg(name, fallback) {
  const args = process.argv.slice(3);
  const equalsArg = args.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];

  return fallback;
}

function loadEnvFile(fileName, { required = false } = {}) {
  const filePath = resolve(PROJECT_ROOT, fileName);
  if (!existsSync(filePath)) {
    if (required) {
      throw new Error(`${fileName} fehlt.`);
    }
    return false;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }

  return true;
}

function parseJsonList(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function listWindowsNextDevServers() {
  const command = `
$project = ${JSON.stringify(PROJECT_ROOT)}
Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine.Contains($project) -and
    $_.CommandLine -match "next(\\\\|/)dist(\\\\|/)(bin|server)" -and
    $_.CommandLine -match "\\bdev\\b"
  } |
  Select-Object ProcessId,CommandLine |
  ConvertTo-Json -Compress
`;

  const output = execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    command,
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return parseJsonList(output).map((row) => ({
    pid: Number(row.ProcessId),
    commandLine: String(row.CommandLine ?? ""),
  }));
}

function listUnixNextDevServers() {
  const output = execFileSync("ps", ["-eo", "pid=,command="], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pid, ...rest] = line.split(/\s+/);
      return { pid: Number(pid), commandLine: rest.join(" ") };
    })
    .filter(
      (row) =>
        row.commandLine.includes(PROJECT_ROOT) &&
        /next[\\/](dist[\\/])?(bin|server)/.test(row.commandLine) &&
        /\bdev\b/.test(row.commandLine),
    );
}

function listNextDevServers() {
  try {
    return platform() === "win32"
      ? listWindowsNextDevServers()
      : listUnixNextDevServers();
  } catch {
    return [];
  }
}

function ensureNoParallelNextDev() {
  const servers = listNextDevServers().filter(
    (server) => server.pid !== process.pid,
  );
  if (servers.length === 0) return;

  console.error("[dev-server] In diesem Projekt laeuft bereits ein Next-Dev-Server:");
  for (const server of servers) {
    console.error(`- PID ${server.pid}: ${server.commandLine}`);
  }
  console.error("[dev-server] Bitte diesen Server bewusst stoppen, dann erneut starten.");
  process.exit(1);
}

const mode = process.argv[2] ?? "local";
if (!["local", "cloud"].includes(mode)) {
  console.error("Nutzung: node scripts/dev-server.mjs <local|cloud> [--port 3005]");
  process.exit(1);
}

const port = readArg("--port", readArg("-p", process.env.PORT || "3000"));
ensureNoParallelNextDev();

if (mode === "cloud") {
  const loadedTestEnv = loadEnvFile(".env.cloud.test");
  if (!loadedTestEnv) {
    loadEnvFile(".env.cloud-current.local", { required: true });
  }
  process.env.NACHBAR_SUPABASE_TARGET = "cloud";
} else {
  loadEnvFile(".env.local");
  process.env.NACHBAR_SUPABASE_TARGET = "local";
}

process.env.PORT = String(port);
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

const nextBin = resolve(PROJECT_ROOT, "node_modules/next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextBin, "dev", "--webpack", "-p", String(port)],
  {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: "inherit",
    shell: false,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
