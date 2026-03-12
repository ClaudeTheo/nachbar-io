import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", "e2e", "tests/e2e", "**/e2e/**", ".next"],
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
