# 2026-06-19 - npm-audit-Triage Prod-Deps

Datum: 2026-06-19
Repo/Worktree: `C:\Users\thoma\Claud Code\Handy APP\nachbar-io-npm-audit`
Branch: `codex/npm-audit-prod-triage`
Basis: `origin/master` = `0d95bcf`

## Anlass

Nach dem Prod-Deploy meldete der CI-Schritt
`npm audit --audit-level=high --omit=dev` HIGH-Vulnerabilities in
Produktions-Dependencies. Keine echten Nutzer im System.

Guardrails eingehalten:

- Kein `npm audit fix --force`.
- Kein Deploy.
- Kein `git push origin master`.
- Aenderungen nur am `package-lock.json`, kein `package.json`.

Hinweis zur lokalen Runtime: Der erste Fixlauf lief versehentlich mit der lokal
vorhandenen Node-Version `v24.13.1` (Codex-Bundle `v24.14.0`). Nach roter
Node-22-CI wurde fuer den Lockfile-Sync-Fix ein portables Node `v22.23.0`
mit npm `10.9.8` verwendet.

## Rohbefund vor Fix

`npm audit --omit=dev --json`:

- `critical`: 0
- `high`: 3
- `moderate`: 13
- `low`: 1
- `total`: 17

Abweichung vom Vorab-Befund: `dompurify` war aktuell **moderate**, nicht HIGH.
Zusatz-HIGHs gegenueber dem Vorab-Befund: `hono` und `ws`.

Abhaengigkeitsketten vor Fix:

- `form-data@4.0.5` via `edge-tts-universal -> axios` und `twilio -> axios`.
- `hono@4.12.18` via `shadcn -> @modelcontextprotocol/sdk`.
- `ws@8.20.0` via `edge-tts-universal` / `isomorphic-ws`; zusaetzlich dev via `storybook`.
- `dompurify@3.4.2` optional via `jspdf`.

Source-Reachability:

- Kein direkter App-Import fuer `dompurify`, `form-data`, `hono` oder Node-`ws`.
- Source-Suche fand nur Browser-`WebSocket` in `lib/terminal/useGpioBridge.ts`
  fuer den lokalen GPIO-Bridge-Client (`ws://localhost:8765`), nicht das npm-Paket `ws`.

## Aktion

Ausgefuehrt:

```bash
npm audit fix
```

Ergebnis:

- kompatible Lockfile-Updates innerhalb vorhandener Ranges.
- `package.json` unveraendert.
- `package-lock.json` geaendert.
- `npm audit fix` selbst endete mit Exit 1, weil non-force/dev/moderate Punkte
  verbleiben; der Prod-High-Gate ist danach aber gruen.

Wichtige Aufloesungen nach Fix:

- `form-data`: `4.0.5` -> `4.0.6`
- `hono`: `4.12.18` -> `4.12.26`
- `ws`: `8.20.0` -> `8.21.0`
- `dompurify`: `3.4.2` -> `3.4.11`
- `@babel/core`: `7.29.7`
- `@opentelemetry/core`: `2.8.0`
- `@sentry/nextjs`: `10.59.0`
- `brace-expansion`: vulnerable 5.x path auf `5.0.6`
- `js-yaml`: `4.2.0`
- `qs`: `6.15.2`
- `tar`: `7.5.16`

## Triage-Tabelle

| Advisory / Paket | Severity | Direkt/transitiv | Erreichbar? | Aktion |
|---|---:|---|---|---|
| `form-data` GHSA-hmw2-7cc7-3qxx | HIGH | transitiv via `axios` (`edge-tts-universal`, `twilio`) | Kein direkter Import; Risiko nur falls transitive Axios-FormData mit user-kontrollierten Feldnamen/Filenames genutzt wird. Im Source kein direkter `form-data`-Pfad gefunden. | Gefixt auf `4.0.6`. |
| `hono` GHSA-88fw-hqm2-52qc + weitere Hono-Advisories | HIGH | transitiv via `shadcn -> @modelcontextprotocol/sdk` | Kein App-Import von `hono`; shadcn ist Tooling/CLI-nahe, keine Hono-Runtime-Route im App-Code gefunden. | Gefixt auf `4.12.26`. |
| `ws` GHSA-96hv-2xvq-fx4p + GHSA-58qx-3vcg-4xpx | HIGH | transitiv via `edge-tts-universal` / `isomorphic-ws`; dev auch via `storybook` | Kein Node-`ws`-Import. Browser-`WebSocket` nur lokal fuer GPIO-Bridge. | Gefixt auf `8.21.0`. |
| `dompurify` mehrere GHSA, u.a. IN_PLACE/XSS | moderate | optional transitiv via `jspdf` | Kein `DOMPurify`-/`IN_PLACE`-Import im App-Code; kein user-kontrollierter DOMPurify-Konfigpfad gefunden. | Gefixt auf `3.4.11`. |
| `@opentelemetry/core` GHSA-8988-4f7v-96qf / `@sentry/*` | moderate | transitiv ueber direkte Dep `@sentry/nextjs` | Sentry ist direkte Prod-Dependency, aber Befund liegt in OTel-Baggage-Verarbeitung. | Gefixt durch kompatibles Sentry/OTel-Lockfile-Update (`@sentry/nextjs 10.59.0`, OTel `2.8.0`). |
| `@babel/core` GHSA-4x5r-pxfx-6jf8 | low | transitiv | Build-/Tooling-Pfad, kein Runtime-user-input-Pfad. | Gefixt auf `7.29.7`. |
| `brace-expansion` GHSA-jxxr-4gwj-5jf2 | moderate | transitiv | Tooling/Glob-Pfade; kein direkter Runtime-Import. | Vulnerabler 5.x-Pfad gefixt auf `5.0.6`; alte 1.x/2.x Pfade nicht vom Advisory betroffen. |
| `js-yaml` GHSA-h67p-54hq-rp68 | moderate | transitiv via `shadcn/cosmiconfig` | Tooling/Config-Pfad; kein direkter Runtime-YAML-Import. | Gefixt auf `4.2.0`. |
| `qs` GHSA-q8mj-m7cp-5q26 | moderate | transitiv via `twilio`/`shadcn` | Kein direkter `qs`-Import; Runtime-Risiko niedrig, 0 echte Nutzer. | Gefixt auf `6.15.2`. |
| `tar` GHSA-vmf3-w455-68vh | moderate | transitiv via `@capacitor/cli` | CLI/Tooling-Pfad; keine App-Runtime-Tar-Verarbeitung. | Gefixt auf `7.5.16`. |
| `next -> postcss` GHSA-qx2v-qp2m-jg93 | moderate | `next` direkt, `postcss` transitiv | Theoretisch Build/CSS-Stringify; keine user-kontrollierte CSS-Eingabe im App-Pfad gefunden. | Deferred: npm meldet Fix nur via `npm audit fix --force`, wuerde `next@9.3.3` installieren (Breaking/Downgrade). Bei 0 echten Nutzern bewusst akzeptiert, bis Next einen kompatiblen Fix liefert. |

## Rohbefund nach Fix

`npm audit --audit-level=high --omit=dev`:

- Exit 0
- keine HIGH/Critical Prod-Vulnerabilities mehr.

Erster lokaler `npm audit --omit=dev --json`-Stand unter Node 24:

- `critical`: 0
- `high`: 0
- `moderate`: 2
- `low`: 0
- `total`: 2
- verbleibend nur `next/postcss` (Breaking-/Force-Fix).

Finaler Node-22-Stand nach Lockfile-Sync-Fix:

- `critical`: 0
- `high`: 0
- `moderate`: 3
- `low`: 0
- `total`: 3
- verbleibend nur die `@sentry/nextjs -> next -> postcss`-Kette. npm bietet
  dafuer weiter nur `npm audit fix --force` mit `next@9.3.3` an.

## Node-22-Lockfile-Fix

PR #44 CI Smoke S7 schlug initial in `npm ci` fehl:

- `Missing: type-fest@4.41.0 from lock file`

Root Cause: Der Node-24-`npm audit fix` hatte den optionalen Storybook-Eintrag
`node_modules/@storybook/nextjs/node_modules/type-fest` entfernt. Der gleiche
Lockfile-Sync-Defekt war bereits in den Dependabot-Fixes `99ee539`/`643d671`
aufgetreten.

Fix: Der optionale Eintrag wurde exakt wie in den frueheren gruenen Fixes
restauriert:

- `node_modules/@storybook/nextjs/node_modules/type-fest`
- Version `4.41.0`
- `dev: true`
- `optional: true`

## Verifikation

Durchgefuehrt im Worktree `nachbar-io-npm-audit`:

- `npm ci` unter Node `v22.23.0` / npm `10.9.8` -> gruen.
- `npx tsc --noEmit` unter Node 22 -> gruen.
- `npx vitest run --exclude "**/.claude/**"` unter Node 22 -> final gruen:
  722 Testdateien, 5078 passed, 1 skipped. Ein erster Full-Run hatte einen
  Timeout in `__tests__/config/csp-local-supabase.test.ts`; gezielter Rerun
  6/6 gruen, anschliessender Full-Run gruen.
- `npm run build` unter Node 22 -> gruen, Next.js `16.2.9` (Turbopack), 244
  static pages generiert.

## Diff

- Nur `package-lock.json`.
- Diffstat: `3642` Zeilen geaendert (`1999 insertions`, `1643 deletions`).

## Offen

- Draft-PR #44 CI nach dem Lockfile-Sync-Fix abwarten.
- Kein Deploy in dieser Aufgabe.
