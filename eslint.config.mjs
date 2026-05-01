import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local generated artifacts:
    ".codex-logs/**",
    ".vercel/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // E2E-Test-Infrastruktur (Playwright Page-Objects + Fixtures):
    // Pattern-Konflikte zwischen Playwright-`use()` und React-Hook-Rules
    // sowie historisch gewachsene `require()`-Imports. Test-Helper sind
    // kein Production-Code, kein Lint-Gate noetig.
    "tests/e2e/**",
  ]),
  {
    rules: {
      // Erlaube Underscore-Prefix fuer bewusst ungenutzte Variablen
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
]);

export default eslintConfig;
