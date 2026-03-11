// Nachbar.io — Multi-Agent E2E Test Konfiguration
import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

// .env.test laden falls vorhanden
import "dotenv/config";

export default defineConfig({
  testDir: path.resolve(__dirname),
  outputDir: path.resolve(__dirname, "../../test-results"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["html", { outputFolder: path.resolve(__dirname, "../../playwright-report"), open: "never" }],
    ["junit", { outputFile: path.resolve(__dirname, "../../test-results/junit.xml") }],
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
    // Setup: Testdaten seeden
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /global-teardown\.ts/,
    },

    // Multi-Agent Szenarien (Desktop Chrome)
    {
      name: "multi-agent",
      testMatch: /scenarios\/.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined, // Jeder Agent verwaltet eigene Session
      },
    },

    // Senioren-Terminal (Mobile Viewport — grosse Touch-Targets)
    {
      name: "senior-terminal",
      testMatch: /scenarios\/s5-.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 5"],
        storageState: undefined,
      },
    },

    // Smoke Tests (schnell, kein Seed noetig)
    {
      name: "smoke",
      testMatch: /scenarios\/s7-.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
