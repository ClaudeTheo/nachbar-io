import { defineConfig } from "vitest/config";
import path from "path";

// .claude/** + **/worktrees/** ausschliessen: verschachtelte Git-Worktrees
// (z. B. .claude/worktrees/*) enthalten Test-Duplikate ohne eigene
// node_modules; ohne Ausschluss sammelt Vitest sie mit ein (~doppelte
// Datei-/Fork-/RAM-Last). Ersetzt die fragile manuelle Flag-Regel
// `--exclude "**/.claude/**"`.
const SHARED_EXCLUDE = [
  "node_modules",
  "**/node_modules/**",
  "e2e",
  "tests/e2e",
  "**/e2e/**",
  ".next",
  "**/.next/**",
  ".claude/**",
  "**/worktrees/**",
  // Codex-Review-Worktrees (z. B. .codex-worktrees/pr82-review) sind stale
  // Repo-Kopien ohne node_modules — `**/worktrees/**` matcht den Ordnernamen
  // ".codex-worktrees" NICHT (Lehre Session 2026-07-11: doppelte Testlaeufe
  // mit 208 Geister-Failures).
  "**/.codex-worktrees/**",
];

// DOM-abhaengige .test.ts-Dateien (renderHook/@testing-library bzw. direkte
// window/document-Nutzung). Sie laufen im dom-Projekt, obwohl sie .ts sind.
// Neue Hook-Tests unter __tests__/hooks/ landen automatisch richtig.
const DOM_TEST_TS = [
  "__tests__/hooks/**/*.test.ts",
  "__tests__/integration/companion-streaming.test.ts",
  "__tests__/lib/auth-apple.test.ts",
  "__tests__/lib/platform-storage.test.ts",
  "__tests__/lib/voice/ios-audio-manager.test.ts",
  "__tests__/lib/voice/whisper-engine.test.ts",
  "__tests__/lib/webrtc/realtime-voice.test.ts",
  "lib/device-pairing/__tests__/use-refresh-rotation.test.ts",
  "lib/geo/__tests__/photon-client.test.ts",
  "lib/quarters/__tests__/hooks.test.ts",
];

export default defineConfig({
  test: {
    // Stabilitaet auf RAM-beschraenkter Box (20 Kerne, ~16 GB RAM):
    // Vitest 4 Default = pool "forks" mit ~Cores-1 (~19) Forks. ~19 jsdom-Forks
    // ueberbuchen die 16 GB -> GC/Paging-Stalls -> wandernde Per-Test-Timeouts
    // (jeder Lauf ein anderer Test, isoliert gruen). Fix: Forks RAM-getrieben
    // kappen + Default-Timeout (5s) anheben, damit ein kurz ausgehungerter,
    // gesunder Test nicht faelschlich scheitert. Ein echter Haenger scheitert
    // weiterhin (nur spaeter) — kein Masking, kein blanket retry.
    // v4-API: test.maxWorkers (NICHT poolOptions.forks.maxForks — in v4 entfernt).
    pool: "forks",
    maxWorkers: 10,
    isolate: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**", "app/api/**"],
      exclude: ["**/*.test.*", "**/*.spec.*"],
    },
    // Zwei Projekte statt global jsdom: ~2/3 der Testdateien (.test.ts) sind
    // Service-/API-Tests ohne DOM-Bedarf — das jsdom-Environment-Setup war
    // der dominante Laufzeitanteil (Wave V, Befund 2026-07-02).
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: [...SHARED_EXCLUDE, ...DOM_TEST_TS],
          setupFiles: ["./vitest.setup.env.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["**/*.test.tsx", ...DOM_TEST_TS],
          exclude: SHARED_EXCLUDE,
          setupFiles: ["./vitest.setup.env.ts", "./vitest.setup.dom.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
