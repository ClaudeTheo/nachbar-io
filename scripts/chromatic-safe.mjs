import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "dry-run";
const hasToken = Boolean(process.env.CHROMATIC_PROJECT_TOKEN);
const hasFounderGo = process.env.CHROMATIC_FOUNDER_GO === "YES";

function runChromatic(args) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(command, ["chromatic", ...args], {
    env: process.env,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

if (mode === "dry-run") {
  if (!hasToken) {
    console.log(
      "Chromatic dry-run skipped: CHROMATIC_PROJECT_TOKEN is not set. No upload was started.",
    );
    process.exit(0);
  }

  runChromatic(["--dry-run"]);
} else if (mode === "ci") {
  if (!hasToken) {
    console.error("Chromatic CI blocked: CHROMATIC_PROJECT_TOKEN is not set.");
    process.exit(1);
  }

  if (!hasFounderGo) {
    console.error(
      "Chromatic CI blocked: set CHROMATIC_FOUNDER_GO=YES only after Founder-Go.",
    );
    process.exit(1);
  }

  runChromatic(["--only-changed", "--exit-once-uploaded"]);
} else {
  console.error(`Unknown Chromatic mode: ${mode}`);
  process.exit(1);
}
