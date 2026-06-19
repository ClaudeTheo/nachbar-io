# Handover: Dependabot-Haushalt #32-#36

Datum: 2026-06-19
Repo: `nachbar-io`
Arbeitsbranch fuer diese Doku: `codex/dependabot-haushalt-handover`
Master-Stand nach Abarbeitung: `3b545b1`

## Ergebnis

Alle Dependabot-PRs #32-#36 sind entschieden.

- #36 `tailwind-merge` 3.5.0 -> 3.6.0: gemerged, Merge-Commit `796ac11239cb7f716108e47a6c280b1073fcf35c`.
- #32 `unpdf` 1.4.0 -> 1.6.2: gemerged, Merge-Commit `939b9faf39a79732ee1e100479a373cd13298da4`.
- #35 `chromatic` 16.10.0 -> 17.5.0: gemerged, Merge-Commit `235f0d3cd66dc48252409de006c041b2d9f086c4`.
- #34 `@types/node` 20.19.37 -> 26.0.0: nicht gemerged, geschlossen. Ersatz-PR #42 auf `@types/node: ^22` ist gemerged, Merge-Commit `093497e69475d8a25385dbed18d5f1dc2753f90b`.
- #33 `@supabase/ssr` 0.9.0 -> 0.12.0: gemerged, Merge-Commit `3b545b1e2b46e0799b488188478539d8ca7f234b`.

## Lockfile-Befund

Alle Dependabot-Branches hatten nach Rebase denselben Linux-CI-Bruch:

`npm ci` meldete `Missing: type-fest@4.41.0 from lock file`.

Ursache: Der optionale Storybook-Transitiv-Eintrag
`node_modules/@storybook/nextjs/node_modules/type-fest` wurde durch Lockfile-Regeneration auf Windows entfernt. Der Eintrag wurde in #36, #32, #35 und #33 jeweils minimal wiederhergestellt. Danach waren die GitHub-Checks gruen.

## #35 Chromatic

Geprueft: Der Diff betrifft nur `package.json` und `package-lock.json`.

`chromatic` liegt in `devDependencies` und wird nur ueber `scripts/chromatic-safe.mjs`/Storybook aufgerufen. Upload/CI-Pfad bleibt token- und Founder-Go-geschuetzt (`CHROMATIC_PROJECT_TOKEN`, `CHROMATIC_FOUNDER_GO=YES`). Kein Runtime-Pfad betroffen.

## #34 Node-Typen

#34 wurde bewusst geschlossen statt gemerged.

Grund: Repo-CI/Runtime nutzt Node 22 (`.github/workflows/*` mit `node-version: 22`), `package.json` hat kein `engines`-Override. `@types/node` 26 kann APIs als typverfuegbar ausweisen, die in der realen Node-22-Runtime nicht existieren.

Ersatz: #42 setzt `@types/node` auf `^22`; Lockfile resolved auf `22.19.21`.

Verifikation #42:

- `npm ci --ignore-scripts` gruen
- `npx tsc --noEmit` gruen
- GitHub Checks gruen: `Smoke Tests (S7)` 5m37s, `Multi-Agent Tests (S1-S6)` 12m26s

## #33 Supabase SSR

Release-/API-Pruefung:

- Offizielle Supabase-SSR-Release-Notes fuer `v0.12.0`: https://github.com/supabase/ssr/releases/tag/v0.12.0
- Relevanter Punkt: Cookie-Handling ueber `getAll`/`setAll` und aktualisierte Cookie-Behandlung.
- Eigene Nutzung geprueft mit `rg "createServerClient|createBrowserClient|@supabase/ssr" lib app middleware.ts`.

Ergebnis:

- `lib/supabase/server.ts` nutzt bereits `cookies.getAll()` und `setAll(cookiesToSet)`.
- `lib/supabase/middleware.ts` nutzt bereits `request.cookies.getAll()` und `setAll(cookiesToSet)`.
- `app/api/test/login/route.ts` nutzt bereits `getAll`/`setAll` fuer Redirect-Cookies.
- `lib/supabase/client.ts` nutzt `createBrowserClient` nur mit `auth.detectSessionInUrl`.
- Keine Breaking-API-Diskrepanz gefunden.
- Lockfile zieht `@supabase/supabase-js` und Subpakete auf `2.108.2`, passend zum Peer von `@supabase/ssr` 0.12.0.

Lokale Verifikation #33:

- `npm ci --ignore-scripts` gruen
- `npx tsc --noEmit` gruen
- `npx vitest run --exclude "**/.claude/**"` gruen: 722 Testdateien, 5078 passed, 1 skipped
- `npm run build` gruen

GitHub Checks #33:

- `Smoke Tests (S7)` gruen, 5m42s
- `Multi-Agent Tests (S1-S6)` gruen, 12m04s

Hinweis: Die Full-Vitest-Suite deckte einen bestehenden, veralteten Auto-Answer-Route-Test auf. Der Test mockte den neuen Ownership-SELECT/Admin-Update/Audit-Pfad noch nicht korrekt und lieferte dadurch 404 statt 200. Die Fixture wurde in #33 aktualisiert; keine Produktlogik wurde geaendert.

## Offene Punkte

Keine offenen Punkte fuer #32-#36. Bekannte `npm audit`-Warnungen (26 total: 8 low, 13 moderate, 5 high) wurden nicht in diesem Haushalt behoben und waren nicht Teil der Dependabot-PRs.

Guardrails eingehalten: kein `git push origin master`, keine Prod-Migration, kein Prod-Apply, keine Secrets, kein Force-Push.
