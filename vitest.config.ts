import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // .claude/** + **/worktrees/** ausschliessen: verschachtelte Git-Worktrees
    // (z. B. .claude/worktrees/*) enthalten Test-Duplikate ohne eigene
    // node_modules; ohne Ausschluss sammelt Vitest sie mit ein (~doppelte
    // Datei-/Fork-/RAM-Last). Ersetzt die fragile manuelle Flag-Regel
    // `--exclude "**/.claude/**"`.
    exclude: [
      "node_modules",
      "**/node_modules/**",
      "e2e",
      "tests/e2e",
      "**/e2e/**",
      ".next",
      "**/.next/**",
      ".claude/**",
      "**/worktrees/**",
    ],
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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
