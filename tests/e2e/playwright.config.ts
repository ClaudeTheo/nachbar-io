// Nachbar.io — Multi-Agent E2E Test Konfiguration
import { defineConfig, devices } from "@playwright/test";
import * as path from "path";
import { authFile } from "./helpers/auth-paths";

// .env.test laden falls vorhanden
import "dotenv/config";

export default defineConfig({
  testDir: path.resolve(__dirname),
  outputDir: path.resolve(__dirname, "../../test-results"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4, // CI: 1 Worker um Supabase Rate-Limiting zu vermeiden
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    [
      "html",
      {
        outputFolder: path.resolve(__dirname, "../../playwright-report"),
        open: "never",
      },
    ],
    [
      "junit",
      { outputFile: path.resolve(__dirname, "../../test-results/junit.xml") },
    ],
    ["list"],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // ─── Phase 0: Testdaten seeden ───
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /global-teardown\.ts/,
    },

    // ─── Phase 1: Auth-States erzeugen (storageState) ───
    {
      name: "auth",
      testMatch: /auth-setup\.ts/,
      dependencies: ["setup"],
    },

    // ─── Phase 2a: Authentifizierte Flows (Nachbar A) ───
    {
      name: "authenticated",
      testMatch: /scenarios\/auth-.*\.spec\.ts/,
      dependencies: ["auth"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile("nachbar_a"),
      },
    },

    // ─── Phase 2b: Multi-Agent Szenarien (eigene Sessions) ───
    {
      name: "multi-agent",
      testMatch: /scenarios\/s[0-46-9].*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined, // Jeder Agent verwaltet eigene Session
      },
    },

    // ─── Phase 2c: Senioren-Terminal (Mobile Viewport) ───
    {
      name: "senior-terminal",
      testMatch: /scenarios\/s5-.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 5"],
        storageState: undefined,
      },
    },

    // ─── Smoke Tests (kein Seed noetig, kein Auth) ───
    {
      name: "smoke",
      testMatch: /scenarios\/s7-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    // In CI: Production-Build verwenden (vermeidet Hydration-Race-Conditions im Dev-Server)
    command: process.env.CI ? "npm start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
