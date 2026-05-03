import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORTS = [3000, 3001];
const CLOUD_SUPABASE_MARKERS = [
  ".env.cloud-current.local",
  "dev:cloud",
  "uylszchlyhbpbmslcnka",
  "supabase.co",
];

export function isLocalhostE2eBaseUrl(baseUrl) {
  const url = baseUrl ?? "http://localhost:3000";

  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function detectLocalhostPreflightProblems(servers, options = {}) {
  if (!isLocalhostE2eBaseUrl(options.baseUrl)) return [];

  return servers.flatMap((server) => {
    const commandLine = server.commandLine ?? "";
    const marker = CLOUD_SUPABASE_MARKERS.find((candidate) =>
      commandLine.includes(candidate),
    );

    if (!marker) return [];

    return [
      `Port ${server.port} (PID ${server.processId}) sieht nach Cloud/Prod-Supabase aus: ${marker}. Stoppen oder auf build:local/start:local Port 3001 ausweichen.`,
    ];
  });
}

function parsePowerShellJson(rawOutput) {
  const trimmed = rawOutput.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function listWindowsLocalhostServers() {
  const command = `
$rows = Get-NetTCPConnection -LocalPort ${PORTS.join(",")} -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      port = $_.LocalPort
      processId = $_.OwningProcess
      commandLine = $proc.CommandLine
    }
  }
$rows | ConvertTo-Json -Compress
`;

  const output = execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    command,
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return parsePowerShellJson(output).map((server) => ({
    port: Number(server.port),
    processId: Number(server.processId),
    commandLine: String(server.commandLine ?? ""),
  }));
}

function listLocalhostServers() {
  if (platform() === "win32") {
    return listWindowsLocalhostServers();
  }

  return [];
}

function runCli() {
  const baseUrl = process.env.E2E_BASE_URL;

  if (!isLocalhostE2eBaseUrl(baseUrl)) {
    console.log("[e2e-preflight] Nicht-localhost E2E_BASE_URL, Guard uebersprungen.");
    return;
  }

  const servers = listLocalhostServers();
  const problems = detectLocalhostPreflightProblems(servers, { baseUrl });

  if (problems.length > 0) {
    console.error("[e2e-preflight] BLOCKED: localhost/Supabase-Ziel passt nicht.");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log("[e2e-preflight] OK: kein Cloud/Prod-Supabase-Server auf localhost 3000/3001 erkannt.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
