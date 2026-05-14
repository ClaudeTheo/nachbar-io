import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

const rootDir = path.resolve(__dirname, "../..");

dotenv.config({
  path: path.join(rootDir, ".env.cloud-current.local"),
  quiet: true,
});
dotenv.config({
  path: path.join(rootDir, ".env.cloud.test"),
  override: true,
  quiet: true,
});

export default defineConfig({
  testDir: path.resolve(__dirname),
  testMatch: /admin-login\.spec\.ts/,
  outputDir: path.resolve(rootDir, "test-results/admin-login"),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: path.resolve(rootDir, "playwright-report/admin-login"),
        open: "never",
      },
    ],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL:
      process.env.ADMIN_LOGIN_BASE_URL ||
      process.env.E2E_BASE_URL ||
      "http://localhost:3005",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
});
